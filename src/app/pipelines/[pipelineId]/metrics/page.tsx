"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMetrics, type MetricsPagePeriod } from "@/hooks/use-metrics";
import { SuccessRateChart } from "@/components/metrics/SuccessRateChart";
import { DurationChart } from "@/components/metrics/DurationChart";

const PERIODS: { value: MetricsPagePeriod; label: string }[] = [
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

  const [period, setPeriod] = useState<MetricsPagePeriod>("7d");
  const { data, isLoading, error, mutate } = useMetrics(pipelineId, period);

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

      {error ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-red-200 bg-red-50 p-8 text-center">
          <AlertCircle className="size-8 text-red-500" />
          <div>
            <p className="font-medium text-red-800">Failed to load metrics</p>
            <p className="text-sm text-red-600">
              {error.message || "An unexpected error occurred."}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => mutate()}>
            <RefreshCw className="size-4" />
            Retry
          </Button>
        </div>
      ) : isLoading ? (
        <MetricsSkeleton />
      ) : data ? (
        <div className="space-y-6">
          <SuccessRateChart
            succeeded={data.executionsSucceeded}
            failed={data.executionsFailed}
          />
          <DurationChart executionTime={data.executionTime} />
        </div>
      ) : null}
    </div>
  );
}
