"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { AlertCircle, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTransformations } from "@/hooks/use-transformations";
import {
  TransformationQuickStats,
  TransformationQuickStatsSkeleton,
} from "@/components/transformation/transformation-quick-stats";
import {
  TransformationCard,
  TransformationCardSkeleton,
} from "@/components/transformation/transformation-card";
import { getClientGroup } from "@/lib/format";

export default function TransformationsPage() {
  const lastUpdatedRef = useRef<Date | null>(null);
  const [lastUpdatedText, setLastUpdatedText] = useState<string | null>(null);

  const onSuccess = useCallback(() => {
    lastUpdatedRef.current = new Date();
    setLastUpdatedText("just now");
  }, []);

  const { jobs, isLoading, error, mutate } = useTransformations({ onSuccess });

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

  const isStale = error && !!jobs;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex items-baseline gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Transformations</h1>
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
        <TransformationQuickStatsSkeleton />
      ) : jobs ? (
        <TransformationQuickStats jobs={jobs} />
      ) : null}

      {error && !jobs ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-red-200 bg-red-50 p-8 text-center">
          <AlertCircle className="size-8 text-red-500" />
          <div>
            <p className="font-medium text-red-800">Failed to load transformation jobs</p>
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
            <TransformationCardSkeleton key={i} />
          ))}
        </div>
      ) : jobs && jobs.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border p-8 text-center text-muted-foreground">
          <p className="font-medium">No transformation jobs found</p>
          <p className="text-sm">
            Jobs will appear here once they are registered.
          </p>
        </div>
      ) : jobs ? (
        <div className="space-y-8">
          {Object.entries(
            jobs.reduce<Record<string, typeof jobs>>((groups, j) => {
              const group = getClientGroup(j.clientName);
              (groups[group] ??= []).push(j);
              return groups;
            }, {})
          )
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([clientName, group]) => (
              <section key={clientName}>
                <h2 className="mb-3 text-lg font-semibold tracking-tight text-foreground">
                  {clientName}
                </h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {group
                    .sort((a, b) => a.jobName.localeCompare(b.jobName))
                    .map((job) => (
                      <TransformationCard key={job.jobId} job={job} />
                    ))}
                </div>
              </section>
            ))}
        </div>
      ) : null}
    </div>
  );
}
