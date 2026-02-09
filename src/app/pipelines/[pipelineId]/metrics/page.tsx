"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { MetricsSkeleton } from "@/components/loading/metrics-skeleton";
import { useMetrics, type MetricsPagePeriod } from "@/hooks/use-metrics";
import { SuccessRateChart } from "@/components/metrics/SuccessRateChart";
import { DurationChart } from "@/components/metrics/DurationChart";

const PERIODS: { value: MetricsPagePeriod; label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
];

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
        <ErrorState
          title="Failed to load metrics"
          message={error.message || "An unexpected error occurred."}
          onRetry={() => mutate()}
        />
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
