"use client";

import { useState } from "react";
import { Activity, Download, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAnalyticsSummary } from "@/hooks/use-analytics-summary";
import { AnalyticsSummaryStats } from "@/components/analytics/analytics-summary-stats";
import { PipelineSlaTable } from "@/components/analytics/pipeline-sla-table";
import { downloadCsv } from "@/lib/csv";
import type { AnalyticsPeriod } from "@/lib/types/api";

const PERIODS: { value: AnalyticsPeriod; label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
];

function SummarySkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

export default function AnalyticsOverviewPage() {
  const [period, setPeriod] = useState<AnalyticsPeriod>("30d");
  const { summary, isLoading, error } = useAnalyticsSummary(period);

  const handleExport = () => {
    if (!summary) return;

    const headers = [
      "Pipeline",
      "Client",
      "Uptime %",
      "Freshness %",
      "Records Synced",
      "Executions",
      "SLA Compliant",
    ];
    const rows = summary.pipelines.map((p) => [
      p.pipelineId,
      p.clientName,
      String(p.uptimePercent),
      p.freshnessPercent !== null ? String(p.freshnessPercent) : "N/A",
      String(p.totalRecordsSynced),
      String(p.totalExecutions),
      p.slaCompliant ? "Yes" : "No",
    ]);

    downloadCsv(`analytics-overview-${period}.csv`, headers, rows);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Activity className="size-5 text-muted-foreground" />
          <h1 className="text-2xl font-bold tracking-tight">
            Analytics Overview
          </h1>
        </div>
        <p className="text-muted-foreground text-sm mt-1">
          Cross-pipeline performance and SLA compliance
        </p>
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
        {summary && (
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
        <SummarySkeleton />
      ) : summary ? (
        <>
          <AnalyticsSummaryStats summary={summary} />
          <PipelineSlaTable pipelines={summary.pipelines} />
        </>
      ) : null}
    </div>
  );
}
