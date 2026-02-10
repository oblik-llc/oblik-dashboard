"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMetrics, type MetricsPagePeriod } from "@/hooks/use-metrics";
import { useExecutionRecords } from "@/hooks/use-execution-records";
import { usePipeline } from "@/hooks/use-pipeline";
import { SuccessRateChart } from "@/components/metrics/SuccessRateChart";
import { DurationChart } from "@/components/metrics/DurationChart";
import { RecordsSyncedChart } from "@/components/metrics/RecordsSyncedChart";
import { DurationTrendChart } from "@/components/metrics/DurationTrendChart";
import { RecordCountChart } from "@/components/streams/record-count-chart";
import { ExportButton } from "@/components/metrics/ExportButton";
import { downloadCsv } from "@/lib/csv";
import { formatDurationMs } from "@/lib/format";

const PERIODS: { value: MetricsPagePeriod; label: string }[] = [
  { value: "1h", label: "1 hour" },
  { value: "6h", label: "6 hours" },
  { value: "24h", label: "24 hours" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
];

function MetricsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-80 w-full rounded-xl" />
      <Skeleton className="h-80 w-full rounded-xl" />
    </div>
  );
}

export default function MetricsPage() {
  const params = useParams<{ pipelineId: string }>();
  const pipelineId = decodeURIComponent(params.pipelineId);

  const [period, setPeriod] = useState<MetricsPagePeriod>("24h");
  const { data: metricsData, isLoading: metricsLoading, error: metricsError, mutate: mutateMetrics } = useMetrics(pipelineId, period);
  const { data: execRecords, isLoading: execLoading, error: execError } = useExecutionRecords(pipelineId);
  const { pipeline } = usePipeline(pipelineId);

  const handleExportSuccessRate = () => {
    if (!metricsData) return;
    const map = new Map<string, { succeeded: number; failed: number }>();
    for (const p of metricsData.executionsSucceeded) {
      map.set(p.timestamp, { succeeded: p.value, failed: 0 });
    }
    for (const p of metricsData.executionsFailed) {
      const existing = map.get(p.timestamp);
      if (existing) {
        existing.failed = p.value;
      } else {
        map.set(p.timestamp, { succeeded: 0, failed: p.value });
      }
    }
    const rows = Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([ts, v]) => [ts, String(v.succeeded), String(v.failed)]);
    downloadCsv(`execution-results-${period}.csv`, ["Timestamp", "Succeeded", "Failed"], rows);
  };

  const handleExportDuration = () => {
    if (!metricsData) return;
    const rows = metricsData.executionTime
      .slice()
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
      .map((p) => [p.timestamp, formatDurationMs(p.value), String(p.value)]);
    downloadCsv(`execution-duration-${period}.csv`, ["Timestamp", "Duration", "Duration (ms)"], rows);
  };

  const handleExportRecordsSynced = () => {
    if (!execRecords) return;
    const rows = execRecords.dataPoints.map((dp) => [
      dp.executionName,
      dp.startDate,
      dp.stopDate ?? "",
      dp.status,
      dp.recordCount != null ? String(dp.recordCount) : "",
      dp.durationSeconds != null ? String(dp.durationSeconds) : "",
    ]);
    downloadCsv("records-synced.csv", ["Execution", "Start", "Stop", "Status", "Records", "Duration (s)"], rows);
  };

  const handleExportDurationTrend = () => {
    if (!execRecords) return;
    const rows = execRecords.dataPoints
      .filter((dp) => dp.durationSeconds != null)
      .map((dp) => [
        dp.executionName,
        dp.startDate,
        dp.status,
        String(dp.durationSeconds),
        formatDurationMs(dp.durationSeconds! * 1000),
      ]);
    downloadCsv("duration-trend.csv", ["Execution", "Start", "Status", "Duration (s)", "Duration (formatted)"], rows);
  };

  const handleExportStreamRecords = () => {
    if (!pipeline?.syncState?.streams) return;
    const rows = pipeline.syncState.streams
      .filter((s) => s.recordCount != null)
      .map((s) => [s.name, String(s.recordCount ?? 0), s.syncMode]);
    downloadCsv("stream-records.csv", ["Stream", "Records", "Sync Mode"], rows);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Metrics</h1>
          <p className="text-muted-foreground text-sm">{pipelineId}</p>
        </div>
        <Link
          href={`/pipelines/${encodeURIComponent(pipelineId)}`}
          className="text-sm text-blue-600 hover:underline"
        >
          Back to pipeline
        </Link>
      </div>

      {/* Period selector */}
      <div className="flex items-center gap-1">
        {PERIODS.map((p) => (
          <Button
            key={p.value}
            variant={period === p.value ? "default" : "outline"}
            size="sm"
            onClick={() => setPeriod(p.value)}
          >
            {p.label}
          </Button>
        ))}
      </div>

      {/* CloudWatch metrics (success rate + avg duration) */}
      {metricsError ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-red-200 bg-red-50 p-8 text-center">
          <AlertCircle className="size-8 text-red-500" />
          <div>
            <p className="font-medium text-red-800">Failed to load metrics</p>
            <p className="text-sm text-red-600">
              {metricsError.message || "An unexpected error occurred."}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => mutateMetrics()}>
            <RefreshCw className="size-4" />
            Retry
          </Button>
        </div>
      ) : metricsLoading ? (
        <MetricsSkeleton />
      ) : metricsData ? (
        <div className="space-y-6">
          <div className="relative">
            <div className="absolute right-4 top-4 z-10">
              <ExportButton onExport={handleExportSuccessRate} />
            </div>
            <SuccessRateChart
              succeeded={metricsData.executionsSucceeded}
              failed={metricsData.executionsFailed}
            />
          </div>
          <div className="relative">
            <div className="absolute right-4 top-4 z-10">
              <ExportButton onExport={handleExportDuration} />
            </div>
            <DurationChart executionTime={metricsData.executionTime} />
          </div>
        </div>
      ) : null}

      {/* Execution-based charts (records synced + duration trend) */}
      {execError ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-red-200 bg-red-50 p-8 text-center">
          <AlertCircle className="size-8 text-red-500" />
          <div>
            <p className="font-medium text-red-800">Failed to load execution data</p>
            <p className="text-sm text-red-600">
              {execError.message || "An unexpected error occurred."}
            </p>
          </div>
        </div>
      ) : execLoading ? (
        <MetricsSkeleton />
      ) : execRecords ? (
        <div className="space-y-6">
          <div className="relative">
            <div className="absolute right-4 top-4 z-10">
              <ExportButton onExport={handleExportRecordsSynced} />
            </div>
            <RecordsSyncedChart dataPoints={execRecords.dataPoints} />
          </div>
          <div className="relative">
            <div className="absolute right-4 top-4 z-10">
              <ExportButton onExport={handleExportDurationTrend} />
            </div>
            <DurationTrendChart dataPoints={execRecords.dataPoints} />
          </div>
        </div>
      ) : null}

      {/* Stream record distribution (current snapshot) */}
      {pipeline?.syncState?.streams && pipeline.syncState.streams.length > 0 && (
        <div className="relative">
          <div className="absolute right-4 top-4 z-10">
            <ExportButton onExport={handleExportStreamRecords} />
          </div>
          <div>
            <RecordCountChart streams={pipeline.syncState.streams} />
            <p className="mt-1 text-center text-xs text-muted-foreground">
              Latest sync &middot;{" "}
              {pipeline.syncState.lastSyncTimestamp
                ? format(
                    parseISO(pipeline.syncState.lastSyncTimestamp),
                    "MMM d, yyyy h:mm a"
                  )
                : "Unknown"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
