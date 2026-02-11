import { listExecutions, describeExecution } from "./stepfunctions";
import { getSlaConfig } from "./sla-db";
import { percentile } from "@/lib/stats";
import type { Pipeline, ExecutionSummary } from "@/lib/types/pipeline";
import type {
  AnalyticsPeriod,
  PipelineAnalyticsResponse,
  SlaConfigResponse,
} from "@/lib/types/api";

const PERIOD_MS: Record<AnalyticsPeriod, number> = {
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
  "90d": 90 * 24 * 60 * 60 * 1000,
};

/**
 * Compute analytics for a single pipeline over a given period.
 * Paginates SFN listExecutions until we're past the period cutoff,
 * then batch-describes to extract recordCount from output.
 */
export async function computePipelineAnalytics(
  pipeline: Pipeline,
  period: AnalyticsPeriod
): Promise<PipelineAnalyticsResponse> {
  const cutoff = new Date(Date.now() - PERIOD_MS[period]);

  // Paginate listExecutions to collect all executions within the period
  const allExecutions: ExecutionSummary[] = [];
  let nextToken: string | undefined;
  let done = false;

  while (!done) {
    const result = await listExecutions(pipeline.state_machine_arn, {
      maxResults: 100,
      nextToken,
    });

    for (const ex of result.executions) {
      if (ex.startDate < cutoff) {
        done = true;
        break;
      }
      allExecutions.push(ex);
    }

    nextToken = result.nextToken;
    if (!nextToken) done = true;
  }

  // Filter to completed executions only
  const completed = allExecutions.filter((e) => e.status !== "RUNNING");
  const succeeded = completed.filter((e) => e.status === "SUCCEEDED");
  const failed = completed.filter((e) =>
    ["FAILED", "TIMED_OUT", "ABORTED"].includes(e.status)
  );

  // Compute durations
  const durations = completed
    .filter((e) => e.stopDate)
    .map((e) => (e.stopDate!.getTime() - e.startDate.getTime()) / 1000);

  const avgDuration =
    durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0;
  const p95Duration = percentile(durations, 95);

  // Batch describe succeeded executions to extract recordCount (max 20 concurrent)
  let totalRecords = 0;
  const describeChunks = chunkArray(succeeded, 20);
  for (const chunk of describeChunks) {
    const details = await Promise.allSettled(
      chunk.map((ex) => describeExecution(ex.executionArn))
    );

    for (const result of details) {
      if (result.status === "fulfilled" && result.value.output) {
        try {
          const parsed = JSON.parse(result.value.output);
          if (typeof parsed.recordCount === "number") {
            totalRecords += parsed.recordCount;
          }
        } catch {
          // Output isn't valid JSON — skip
        }
      }
    }
  }

  // Uptime
  const uptimePercent =
    completed.length > 0
      ? Math.round((succeeded.length / completed.length) * 10000) / 100
      : 100;

  // Freshness
  const intervalMinutes = parseScheduleIntervalMinutes(
    pipeline.schedule_expression
  );
  let freshnessPercent: number | null = null;
  if (intervalMinutes !== null && succeeded.length > 0) {
    const slaConfig = await getSlaConfig(pipeline.pipeline_id);
    const windowMinutes =
      slaConfig?.freshnessWindowMinutes ?? intervalMinutes * 2;
    freshnessPercent = computeFreshness(
      succeeded,
      intervalMinutes,
      windowMinutes,
      cutoff
    );
  }

  // SLA config
  const slaConfigRaw = await getSlaConfig(pipeline.pipeline_id);
  const slaConfig: SlaConfigResponse | null = slaConfigRaw
    ? {
        pipelineId: slaConfigRaw.pipeline_id,
        enabled: slaConfigRaw.enabled,
        uptimeTargetPercent: slaConfigRaw.uptimeTargetPercent,
        maxExecutionDurationSeconds: slaConfigRaw.maxExecutionDurationSeconds,
        freshnessWindowMinutes: slaConfigRaw.freshnessWindowMinutes,
      }
    : null;

  // Duration SLA violations
  const executionsOverDurationSla = slaConfig
    ? durations.filter((d) => d > slaConfig.maxExecutionDurationSeconds).length
    : 0;

  return {
    pipelineId: pipeline.pipeline_id,
    period,
    uptimePercent,
    totalExecutions: completed.length,
    succeededCount: succeeded.length,
    failedCount: failed.length,
    totalRecordsSynced: totalRecords,
    avgRecordsPerSync:
      succeeded.length > 0 ? Math.round(totalRecords / succeeded.length) : 0,
    avgDurationSeconds: Math.round(avgDuration * 100) / 100,
    p95DurationSeconds: Math.round(p95Duration * 100) / 100,
    freshnessPercent,
    executionsOverDurationSla,
    slaConfig,
  };
}

/**
 * Parse schedule_expression to an interval in minutes.
 * Supports `rate(N hours|minutes|days)` and simple cron patterns.
 */
export function parseScheduleIntervalMinutes(
  expression: string
): number | null {
  // rate(N units)
  const rateMatch = expression.match(/^rate\((\d+)\s+(minute|hour|day)s?\)$/i);
  if (rateMatch) {
    const n = parseInt(rateMatch[1], 10);
    const unit = rateMatch[2].toLowerCase();
    if (unit === "minute") return n;
    if (unit === "hour") return n * 60;
    if (unit === "day") return n * 1440;
  }

  // cron(min hour day-of-month month day-of-week year)
  // Handle simple patterns like cron(0 */6 * * ? *) or cron(0 0 * * ? *)
  const cronMatch = expression.match(
    /^cron\((\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\)$/
  );
  if (cronMatch) {
    const [, minute, hour] = cronMatch;

    // Every N hours: */N or 0/N in hour field, fixed minute
    const hourStep = hour.match(/^\*\/(\d+)$/) || hour.match(/^0\/(\d+)$/);
    if (hourStep && /^\d+$/.test(minute)) {
      return parseInt(hourStep[1], 10) * 60;
    }

    // Every N minutes: */N in minute field
    const minStep = minute.match(/^\*\/(\d+)$/) || minute.match(/^0\/(\d+)$/);
    if (minStep && hour === "*") {
      return parseInt(minStep[1], 10);
    }

    // Fixed hour, fixed minute (runs once per day): e.g., cron(0 0 * * ? *)
    if (/^\d+$/.test(minute) && /^\d+$/.test(hour)) {
      return 1440; // once per day
    }
  }

  return null;
}

/**
 * Compute freshness: percentage of expected intervals where a successful
 * execution completed within the allowed window.
 */
function computeFreshness(
  succeededExecutions: ExecutionSummary[],
  intervalMinutes: number,
  windowMinutes: number,
  periodStart: Date
): number {
  const now = Date.now();
  const intervalMs = intervalMinutes * 60 * 1000;
  const windowMs = windowMinutes * 60 * 1000;

  // Generate expected interval checkpoints
  const checkpoints: number[] = [];
  let t = now;
  while (t >= periodStart.getTime()) {
    checkpoints.push(t);
    t -= intervalMs;
  }

  if (checkpoints.length === 0) return 100;

  // Sort succeeded executions by stopDate descending
  const sortedSucceeded = succeededExecutions
    .filter((e) => e.stopDate)
    .map((e) => e.stopDate!.getTime())
    .sort((a, b) => b - a);

  let onTime = 0;
  for (const checkpoint of checkpoints) {
    // Check if any succeeded execution completed within the window of this checkpoint
    const windowStart = checkpoint - windowMs;
    const hasExecution = sortedSucceeded.some(
      (ts) => ts >= windowStart && ts <= checkpoint
    );
    if (hasExecution) onTime++;
  }

  return Math.round((onTime / checkpoints.length) * 10000) / 100;
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}
