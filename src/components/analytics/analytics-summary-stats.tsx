"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AnalyticsSummaryResponse } from "@/lib/types/api";

interface AnalyticsSummaryStatsProps {
  summary: AnalyticsSummaryResponse;
}

export function AnalyticsSummaryStats({ summary }: AnalyticsSummaryStatsProps) {
  const { totals } = summary;

  const slaColor =
    totals.slaCompliantCount === totals.totalPipelines
      ? "text-emerald-600"
      : "text-amber-600";

  const stats = [
    {
      label: "Total Pipelines",
      value: String(totals.totalPipelines),
      color: "text-foreground",
    },
    {
      label: "SLA Compliant",
      value: `${totals.slaCompliantCount}/${totals.totalPipelines}`,
      color: slaColor,
    },
    {
      label: "Overall Uptime",
      value: `${totals.overallUptimePercent}%`,
      color:
        totals.overallUptimePercent >= 99
          ? "text-emerald-600"
          : "text-foreground",
    },
    {
      label: "Total Records Synced",
      value: formatNumber(totals.totalRecordsSynced),
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
          <CardContent>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
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
