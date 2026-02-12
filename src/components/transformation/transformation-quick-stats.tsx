"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { TransformationJobOverview } from "@/lib/types/api";

interface TransformationQuickStatsProps {
  jobs: TransformationJobOverview[];
}

export function TransformationQuickStats({ jobs }: TransformationQuickStatsProps) {
  const totalJobs = jobs.length;
  const runningNow = jobs.filter((j) => j.isCurrentlyRunning).length;
  const healthy = jobs.filter((j) => j.status === "healthy").length;
  const failing = jobs.filter((j) => j.status === "failing").length;

  const stats = [
    { label: "Total Jobs", value: totalJobs },
    { label: "Running Now", value: runningNow },
    { label: "Healthy", value: healthy },
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

export function TransformationQuickStatsSkeleton() {
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
