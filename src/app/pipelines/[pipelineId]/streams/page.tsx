"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { AlertCircle, RefreshCw, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePipeline } from "@/hooks/use-pipeline";
import { StreamStats } from "@/components/streams/stream-stats";
import { RecordCountChart } from "@/components/streams/record-count-chart";
import { EnhancedStreamTable } from "@/components/streams/enhanced-stream-table";

function StreamsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-80 w-full" />
    </div>
  );
}

export default function StreamsPage() {
  const params = useParams<{ pipelineId: string }>();
  const pipelineId = decodeURIComponent(params.pipelineId);
  const { pipeline, isLoading, error, mutate } = usePipeline(pipelineId);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Database className="size-6 text-muted-foreground" />
            Streams
          </h1>
          <p className="text-sm text-muted-foreground">{pipelineId}</p>
        </div>
        <Link
          href={`/pipelines/${encodeURIComponent(pipelineId)}`}
          className="text-sm text-blue-600 hover:underline"
        >
          Back to pipeline
        </Link>
      </div>

      {/* Content */}
      {error ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-red-200 bg-red-50 p-8 text-center">
          <AlertCircle className="size-8 text-red-500" />
          <div>
            <p className="font-medium text-red-800">
              Failed to load pipeline
            </p>
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
        <StreamsSkeleton />
      ) : !pipeline ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border p-8 text-center text-muted-foreground">
          <p className="font-medium">Pipeline not found</p>
          <p className="text-sm">
            This pipeline may have been removed or you don&apos;t have access.
          </p>
        </div>
      ) : !pipeline.syncState ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border p-8 text-center text-muted-foreground">
          <Database className="size-8 opacity-40" />
          <p className="font-medium">No sync state available</p>
          <p className="text-sm">
            This pipeline hasn&apos;t completed a sync yet, or sync state data
            is unavailable.
          </p>
        </div>
      ) : (
        <>
          <StreamStats
            streams={pipeline.syncState.streams}
            lastSyncTimestamp={pipeline.syncState.lastSyncTimestamp}
          />
          <RecordCountChart streams={pipeline.syncState.streams} />
          <EnhancedStreamTable streams={pipeline.syncState.streams} />
        </>
      )}
    </div>
  );
}
