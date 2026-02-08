import { NextResponse } from "next/server";
import { getPipeline, getSyncState } from "@/lib/aws/dynamodb";
import {
  isCurrentlyRunning,
  listExecutions,
  getExecutionDetail,
} from "@/lib/aws/stepfunctions";
import { getMetrics } from "@/lib/aws/cloudwatch";
import {
  requireAuth,
  getClientFilter,
  computeStatus,
  computeSuccessRate,
  computeDurationSeconds,
  buildLastSync,
  handleAwsError,
} from "@/lib/api/helpers";
import type {
  ExecutionSummaryResponse,
  SyncStateResponse,
  PipelineMetricsResponse,
  MetricDataPointResponse,
  PipelineDetailResponse,
} from "@/lib/types/api";
import type {
  ExecutionSummary,
  PipelineMetrics,
  SyncState,
} from "@/lib/types/pipeline";
import type { StreamSummary } from "@/lib/types/api";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ pipelineId: string }> }
) {
  try {
    // 1. Authenticate
    const authResult = await requireAuth();
    if (authResult.errorResponse) return authResult.errorResponse;
    const { session } = authResult;

    // 2. Decode pipeline ID (handles %23 → # etc.)
    const { pipelineId: rawId } = await params;
    const pipelineId = decodeURIComponent(rawId);

    // 3. Fetch pipeline from registry
    const pipeline = await getPipeline(pipelineId);
    if (!pipeline) {
      return NextResponse.json(
        { error: "Not Found", message: "Pipeline not found" },
        { status: 404 }
      );
    }

    // 4. Multi-tenant check — return 404 (not 403) to avoid leaking existence
    const allowedClients = getClientFilter(session.user.groups);
    if (allowedClients && !allowedClients.includes(pipeline.client_name)) {
      return NextResponse.json(
        { error: "Not Found", message: "Pipeline not found" },
        { status: 404 }
      );
    }

    // 5. Parallel enrichment (graceful degradation)
    const [runningResult, execResult, syncResult, metricsResult] =
      await Promise.allSettled([
        isCurrentlyRunning(pipeline.state_machine_arn),
        listExecutions(pipeline.state_machine_arn, { maxResults: 10 }),
        getSyncState(pipeline.sync_state_table_name, pipeline.pipeline_id),
        getMetrics(pipeline.state_machine_arn, "24h"),
      ]);

    const running =
      runningResult.status === "fulfilled" ? runningResult.value : false;
    const executions =
      execResult.status === "fulfilled"
        ? execResult.value.executions
        : [];
    const syncState =
      syncResult.status === "fulfilled" ? syncResult.value : null;
    const metrics =
      metricsResult.status === "fulfilled" ? metricsResult.value : null;

    const latest = executions[0];
    const latestCompleted = executions.find((e) => e.status !== "RUNNING");

    // 6. Get execution detail for record count (sequential — needs latestCompleted)
    let lastSync = buildLastSync(latestCompleted);
    if (latestCompleted) {
      try {
        const { detail } = await getExecutionDetail(
          latestCompleted.executionArn
        );
        lastSync = buildLastSync(latestCompleted, detail);
      } catch {
        // Keep lastSync without recordCount
      }
    }

    // 7. Build response
    const body: PipelineDetailResponse = {
      pipelineId: pipeline.pipeline_id,
      clientName: pipeline.client_name,
      connectorType: pipeline.connector_type,
      environment: pipeline.environment,
      enabled: pipeline.enabled,
      stateMachineArn: pipeline.state_machine_arn,
      ecsClusterName: pipeline.ecs_cluster_name,
      syncStateTableName: pipeline.sync_state_table_name,
      s3ArchiveBucket: pipeline.s3_archive_bucket,
      snsTopicArn: pipeline.sns_topic_arn,
      scheduleArn: pipeline.schedule_arn,
      scheduleExpression: pipeline.schedule_expression,
      destinationType: pipeline.destination_type,
      containerImage: pipeline.container_image,
      ecsLogGroup: pipeline.ecs_log_group,
      sfnLogGroup: pipeline.sfn_log_group,
      registeredAt: pipeline.registered_at,
      updatedAt: pipeline.updated_at,
      status: computeStatus(running, latest),
      isCurrentlyRunning: running,
      lastSync,
      recentSuccessRate: computeSuccessRate(executions),
      recentExecutions: executions.map(serializeExecution),
      syncState: syncState ? serializeSyncState(syncState) : null,
      metrics: serializeMetrics(metrics),
    };

    return NextResponse.json(body, {
      headers: {
        "Cache-Control": "s-maxage=15, stale-while-revalidate=30",
      },
    });
  } catch (error) {
    return handleAwsError(error);
  }
}

function serializeExecution(exec: ExecutionSummary): ExecutionSummaryResponse {
  return {
    executionArn: exec.executionArn,
    name: exec.name,
    status: exec.status,
    startDate: exec.startDate.toISOString(),
    stopDate: exec.stopDate?.toISOString() ?? null,
  };
}

function serializeSyncState(state: SyncState): SyncStateResponse {
  // Build stream summaries by merging sync_stats.results with airbyte_state
  const streamMap = new Map<
    string,
    { count: number | null; s3Path: string | null }
  >();

  // Populate from sync_stats.results
  if (state.sync_stats?.results) {
    for (const [name, result] of Object.entries(state.sync_stats.results)) {
      streamMap.set(name, { count: result.count, s3Path: result.s3_path });
    }
  }

  // Enrich with cursor info from airbyte_state
  const streams: StreamSummary[] = [];
  const seen = new Set<string>();

  if (state.airbyte_state) {
    for (const entry of state.airbyte_state) {
      const name = entry.stream.stream_descriptor.name;
      seen.add(name);
      const statsEntry = streamMap.get(name);

      // Extract cursor: first key that isn't __ab_no_cursor_state_message
      const stateObj = entry.stream.stream_state;
      const cursorKeys = Object.keys(stateObj).filter(
        (k) => k !== "__ab_no_cursor_state_message"
      );
      const cursorField = cursorKeys[0] ?? null;
      const cursorValue = cursorField ? String(stateObj[cursorField]) : null;

      streams.push({
        name,
        recordCount: statsEntry?.count ?? null,
        s3Path: statsEntry?.s3Path ?? null,
        cursorField,
        cursorValue,
      });
    }
  }

  // Add any streams from sync_stats that weren't in airbyte_state
  for (const [name, entry] of streamMap) {
    if (!seen.has(name)) {
      streams.push({
        name,
        recordCount: entry.count,
        s3Path: entry.s3Path,
        cursorField: null,
        cursorValue: null,
      });
    }
  }

  return {
    clientConnector: state.client_connector,
    lastSyncTimestamp: state.last_sync,
    lastExecutionStatus: state.last_execution_status,
    totalRecords: state.sync_stats?.total_records ?? null,
    executionDuration: state.sync_stats?.execution_duration ?? null,
    streams,
  };
}

function serializeMetrics(
  metrics: PipelineMetrics | null
): PipelineMetricsResponse {
  const empty: MetricDataPointResponse[] = [];
  if (!metrics) {
    return {
      executionsSucceeded: empty,
      executionsFailed: empty,
      executionsStarted: empty,
      executionTime: empty,
    };
  }

  const serialize = (
    points: { timestamp: Date; value: number }[]
  ): MetricDataPointResponse[] =>
    points.map((p) => ({
      timestamp: p.timestamp.toISOString(),
      value: p.value,
    }));

  return {
    executionsSucceeded: serialize(metrics.executionsSucceeded),
    executionsFailed: serialize(metrics.executionsFailed),
    executionsStarted: serialize(metrics.executionsStarted),
    executionTime: serialize(metrics.executionTime),
  };
}
