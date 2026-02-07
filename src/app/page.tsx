"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePipelines } from "@/hooks/use-pipelines";
import { QuickStats, QuickStatsSkeleton } from "@/components/dashboard/quick-stats";
import { PipelineCard, PipelineCardSkeleton } from "@/components/dashboard/pipeline-card";

export default function Home() {
  const { pipelines, isLoading, error, mutate } = usePipelines();

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <h1 className="text-2xl font-bold tracking-tight">Pipelines</h1>

      {isLoading ? (
        <QuickStatsSkeleton />
      ) : pipelines ? (
        <QuickStats pipelines={pipelines} />
      ) : null}

      {error ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-red-200 bg-red-50 p-8 text-center">
          <AlertCircle className="size-8 text-red-500" />
          <div>
            <p className="font-medium text-red-800">Failed to load pipelines</p>
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <PipelineCardSkeleton key={i} />
          ))}
        </div>
      ) : pipelines && pipelines.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border p-8 text-center text-muted-foreground">
          <p className="font-medium">No pipelines found</p>
          <p className="text-sm">
            Pipelines will appear here once they are registered.
          </p>
        </div>
      ) : pipelines ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pipelines.map((pipeline) => (
            <PipelineCard key={pipeline.pipelineId} pipeline={pipeline} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
