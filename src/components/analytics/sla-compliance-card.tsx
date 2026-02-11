"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { PipelineAnalyticsResponse } from "@/lib/types/api";
import { formatDurationMs } from "@/lib/format";

interface SlaComplianceCardProps {
  analytics: PipelineAnalyticsResponse;
}

export function SlaComplianceCard({ analytics }: SlaComplianceCardProps) {
  const sla = analytics.slaConfig;

  if (!sla || !sla.enabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>SLA Compliance</CardTitle>
          <CardDescription>No SLA thresholds configured</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Configure SLA thresholds below to track compliance.
          </p>
        </CardContent>
      </Card>
    );
  }

  const uptimeMet = analytics.uptimePercent >= sla.uptimeTargetPercent;
  const durationMet =
    analytics.p95DurationSeconds <= sla.maxExecutionDurationSeconds;

  const rows = [
    {
      label: "Uptime",
      target: `${sla.uptimeTargetPercent}%`,
      actual: `${analytics.uptimePercent}%`,
      met: uptimeMet,
    },
    {
      label: "p95 Duration",
      target: formatDurationMs(sla.maxExecutionDurationSeconds * 1000),
      actual: formatDurationMs(analytics.p95DurationSeconds * 1000),
      met: durationMet,
    },
    {
      label: "Duration Violations",
      target: "0",
      actual: String(analytics.executionsOverDurationSla),
      met: analytics.executionsOverDurationSla === 0,
    },
  ];

  if (analytics.freshnessPercent !== null) {
    rows.push({
      label: "Freshness",
      target: "100%",
      actual: `${analytics.freshnessPercent}%`,
      met: analytics.freshnessPercent >= 100,
    });
  }

  const allMet = rows.every((r) => r.met);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>SLA Compliance</CardTitle>
            <CardDescription>
              Thresholds vs. actual performance
            </CardDescription>
          </div>
          <Badge variant={allMet ? "secondary" : "destructive"}>
            {allMet ? "Compliant" : "Breach"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-muted-foreground">{row.label}</span>
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground">
                  Target: {row.target}
                </span>
                <span
                  className={`font-medium ${row.met ? "text-emerald-600" : "text-red-600"}`}
                >
                  {row.actual}
                </span>
                <span
                  className={`size-2 rounded-full ${row.met ? "bg-emerald-500" : "bg-red-500"}`}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
