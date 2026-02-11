"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Activity, Download, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePipelineAnalytics } from "@/hooks/use-pipeline-analytics";
import { useSlaConfig } from "@/hooks/use-sla-config";
import { useExecutionRecords } from "@/hooks/use-execution-records";
import { AnalyticsStats } from "@/components/analytics/analytics-stats";
import { SlaComplianceCard } from "@/components/analytics/sla-compliance-card";
import { FreshnessChart } from "@/components/analytics/freshness-chart";
import { SlaConfigForm } from "@/components/analytics/sla-config-form";
import { downloadCsv } from "@/lib/csv";
import type { AnalyticsPeriod } from "@/lib/types/api";

const PERIODS: { value: AnalyticsPeriod; label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
];

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-40 rounded-xl" />
      <Skeleton className="h-80 rounded-xl" />
    </div>
  );
}

export default function PipelineAnalyticsPage() {
  const params = useParams<{ pipelineId: string }>();
  const pipelineId = decodeURIComponent(params.pipelineId);
  const { data: session } = useSession();
  const isAdmin = session?.user?.groups?.includes("Admin") ?? false;

  const [period, setPeriod] = useState<AnalyticsPeriod>("30d");

  const { analytics, isLoading, error } = usePipelineAnalytics(
    pipelineId,
    period
  );
  const { config: slaConfig, mutate: mutateSla } = useSlaConfig(pipelineId);
  const { data: executionRecords } = useExecutionRecords(pipelineId, 200);

  const handleExport = () => {
    if (!analytics) return;

    const headers = [
      "Metric",
      "Value",
    ];
    const rows = [
      ["Period", analytics.period],
      ["Uptime %", String(analytics.uptimePercent)],
      ["Total Executions", String(analytics.totalExecutions)],
      ["Succeeded", String(analytics.succeededCount)],
      ["Failed", String(analytics.failedCount)],
      ["Total Records Synced", String(analytics.totalRecordsSynced)],
      ["Avg Records/Sync", String(analytics.avgRecordsPerSync)],
      ["Avg Duration (s)", String(analytics.avgDurationSeconds)],
      ["p95 Duration (s)", String(analytics.p95DurationSeconds)],
      [
        "Freshness %",
        analytics.freshnessPercent !== null
          ? String(analytics.freshnessPercent)
          : "N/A",
      ],
      [
        "Duration SLA Violations",
        String(analytics.executionsOverDurationSla),
      ],
    ];

    downloadCsv(
      `${pipelineId}-analytics-${period}.csv`,
      headers,
      rows
    );
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="size-5 text-muted-foreground" />
            <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          </div>
          <p className="text-muted-foreground text-sm mt-1">{pipelineId}</p>
        </div>
        <Link
          href={`/pipelines/${encodeURIComponent(pipelineId)}`}
          className="text-sm text-blue-600 hover:underline"
        >
          Back to pipeline
        </Link>
      </div>

      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
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
        {analytics && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 px-2 text-xs"
            onClick={handleExport}
          >
            <Download className="size-3.5" />
            Export CSV
          </Button>
        )}
      </div>

      {/* Content */}
      {error ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-red-200 bg-red-50 p-8 text-center">
          <AlertCircle className="size-8 text-red-500" />
          <div>
            <p className="font-medium text-red-800">
              Failed to load analytics
            </p>
            <p className="text-sm text-red-600">
              {error.message || "An unexpected error occurred."}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            <RefreshCw className="size-4" />
            Retry
          </Button>
        </div>
      ) : isLoading ? (
        <AnalyticsSkeleton />
      ) : analytics ? (
        <>
          <AnalyticsStats analytics={analytics} />

          <SlaComplianceCard analytics={analytics} />

          <FreshnessChart
            analytics={analytics}
            executions={
              executionRecords?.dataPoints.map((d) => ({
                startDate: d.startDate,
                stopDate: d.stopDate,
                status: d.status,
              })) ?? []
            }
          />

          {isAdmin && slaConfig && (
            <SlaConfigForm
              pipelineId={pipelineId}
              config={slaConfig}
              onSaved={() => mutateSla()}
            />
          )}
        </>
      ) : null}
    </div>
  );
}
