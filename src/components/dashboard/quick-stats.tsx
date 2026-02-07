"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { PipelineOverview } from "@/lib/types/api";

interface QuickStatsProps {
  pipelines: PipelineOverview[];
}

export function QuickStats({ pipelines }: QuickStatsProps) {
  const totalPipelines = pipelines.length;
  const runningNow = pipelines.filter((p) => p.isCurrentlyRunning).length;
  const avgSuccessRate =
    totalPipelines > 0
      ? pipelines.reduce((sum, p) => sum + p.recentSuccessRate, 0) /
        totalPipelines
      : 0;
  const failing = pipelines.filter((p) => p.status === "failing").length;

  const stats = [
    { label: "Total Pipelines", value: totalPipelines },
    { label: "Running Now", value: runningNow },
    {
      label: "Avg Success Rate",
      value: `${Math.round(avgSuccessRate * 100)}%`,
    },
    { label: "Failing", value: failing },
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
            <p className="text-2xl font-bold">{stat.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function QuickStatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="py-4">
          <CardHeader className="pb-0">
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
