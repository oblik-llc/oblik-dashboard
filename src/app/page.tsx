"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { usePipelines } from "@/hooks/use-pipelines";
import { QuickStats, QuickStatsSkeleton } from "@/components/dashboard/quick-stats";
import { PipelineCard, PipelineCardSkeleton } from "@/components/dashboard/pipeline-card";

export default function Home() {
  const lastUpdatedRef = useRef<Date | null>(null);
  const [lastUpdatedText, setLastUpdatedText] = useState<string | null>(null);

  const onSuccess = useCallback(() => {
    lastUpdatedRef.current = new Date();
    setLastUpdatedText("just now");
  }, []);

  const { pipelines, isLoading, error, mutate } = usePipelines({ onSuccess });

  // Re-render the relative timestamp every 10s
  useEffect(() => {
    const id = setInterval(() => {
      if (lastUpdatedRef.current) {
        setLastUpdatedText(
          formatDistanceToNow(lastUpdatedRef.current, { addSuffix: true })
        );
      }
    }, 10_000);
    return () => clearInterval(id);
  }, []);

  const isStale = error && !!pipelines;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex items-baseline gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Pipelines</h1>
        {lastUpdatedText && (
          <span className="text-xs text-muted-foreground">
            Updated {lastUpdatedText}
          </span>
        )}
      </div>

      {isStale && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900 dark:bg-amber-950">
          <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-500" />
          <p className="flex-1 text-sm text-amber-800 dark:text-amber-200">
            Data may be stale — last update failed
          </p>
          <Button
            variant="outline"
            size="sm"
            className="h-7 border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-900"
            onClick={() => mutate()}
          >
            <RefreshCw className="size-3" />
            Retry
          </Button>
        </div>
      )}

      {isLoading ? (
        <QuickStatsSkeleton />
      ) : pipelines ? (
        <QuickStats pipelines={pipelines} />
      ) : null}

      {error && !pipelines ? (
        <ErrorState
          title="Failed to load pipelines"
          message={error.message || "An unexpected error occurred."}
          onRetry={() => mutate()}
        />
      ) : isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <PipelineCardSkeleton key={i} />
          ))}
        </div>
      ) : pipelines && pipelines.length === 0 ? (
        <EmptyState
          title="No pipelines found"
          description="Pipelines will appear here once they are registered."
        />
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
