import { GetMetricDataCommand } from "@aws-sdk/client-cloudwatch";
import { getCloudWatchClient } from "./client";
import type {
  MetricPeriod,
  MetricDataPoint,
  PipelineMetrics,
} from "@/lib/types/pipeline";
import { AwsServiceError } from "@/lib/types/pipeline";

const PERIOD_CONFIG: Record<MetricPeriod, { periodSeconds: number; rangeMs: number }> = {
  "1h":  { periodSeconds: 60,    rangeMs: 60 * 60 * 1000 },
  "6h":  { periodSeconds: 300,   rangeMs: 6 * 60 * 60 * 1000 },
  "24h": { periodSeconds: 900,   rangeMs: 24 * 60 * 60 * 1000 },
  "7d":  { periodSeconds: 3600,  rangeMs: 7 * 24 * 60 * 60 * 1000 },
  "30d": { periodSeconds: 21600, rangeMs: 30 * 24 * 60 * 60 * 1000 },
};

export { PERIOD_CONFIG };

const SFN_NAMESPACE = "AWS/States";

export async function getMetrics(
  stateMachineArn: string,
  period: MetricPeriod = "24h"
): Promise<PipelineMetrics> {
  const client = getCloudWatchClient();
  const config = PERIOD_CONFIG[period];
  const now = new Date();
  const startTime = new Date(now.getTime() - config.rangeMs);

  const dimension = {
    Name: "StateMachineArn",
    Value: stateMachineArn,
  };

  const metricIds = [
    { id: "succeeded", metricName: "ExecutionsSucceeded" },
    { id: "failed", metricName: "ExecutionsFailed" },
    { id: "started", metricName: "ExecutionsStarted" },
    { id: "duration", metricName: "ExecutionTime" },
  ] as const;

  try {
    const result = await client.send(
      new GetMetricDataCommand({
        StartTime: startTime,
        EndTime: now,
        MetricDataQueries: metricIds.map(({ id, metricName }) => ({
          Id: id,
          MetricStat: {
            Metric: {
              Namespace: SFN_NAMESPACE,
              MetricName: metricName,
              Dimensions: [dimension],
            },
            Period: config.periodSeconds,
            Stat: metricName === "ExecutionTime" ? "Average" : "Sum",
          },
        })),
      })
    );

    function toDataPoints(id: string): MetricDataPoint[] {
      const series = result.MetricDataResults?.find((r) => r.Id === id);
      if (!series?.Timestamps || !series.Values) return [];
      return series.Timestamps.map((ts, i) => ({
        timestamp: ts,
        value: series.Values![i],
      })).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    }

    return {
      executionsSucceeded: toDataPoints("succeeded"),
      executionsFailed: toDataPoints("failed"),
      executionsStarted: toDataPoints("started"),
      executionTime: toDataPoints("duration"),
    };
  } catch (error) {
    throw new AwsServiceError("CloudWatch", "GetMetricData", error);
  }
}
