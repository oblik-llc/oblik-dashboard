"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { PipelineAnalyticsResponse } from "@/lib/types/api";

interface AnalyticsStatsProps {
  analytics: PipelineAnalyticsResponse;
}

export function AnalyticsStats({ analytics }: AnalyticsStatsProps) {
  const uptimeTarget = analytics.slaConfig?.uptimeTargetPercent ?? 99;
  const uptimeMet = analytics.uptimePercent >= uptimeTarget;
  const freshnessMet =
    analytics.freshnessPercent === null || analytics.freshnessPercent >= 100;

  const stats = [
    {
      label: "Uptime",
      value: `${analytics.uptimePercent}%`,
      detail: `Target: ${uptimeTarget}%`,
      color: uptimeMet ? "text-emerald-600" : "text-red-600",
    },
    {
      label: "Freshness",
      value:
        analytics.freshnessPercent !== null
          ? `${analytics.freshnessPercent}%`
          : "N/A",
      detail:
        analytics.freshnessPercent !== null
          ? analytics.freshnessPercent >= 100
            ? "All syncs on time"
            : "Some syncs delayed"
          : "No schedule detected",
      color: freshnessMet ? "text-emerald-600" : "text-amber-600",
    },
    {
      label: "Records Synced",
      value: formatNumber(analytics.totalRecordsSynced),
      detail: `${formatNumber(analytics.avgRecordsPerSync)} avg/sync`,
      color: "text-foreground",
    },
    {
      label: "Executions",
      value: `${analytics.succeededCount}/${analytics.totalExecutions}`,
      detail: `${analytics.failedCount} failed`,
      color: "text-foreground",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="py-4">
          <CardHeader className="pb-0">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              {stat.label}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0.5">
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.detail}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}
