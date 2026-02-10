"use client";

import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { AlertCircle, RefreshCw, BarChart3, FileText, Database, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePipeline } from "@/hooks/use-pipeline";
import { PipelineHeader } from "@/components/pipeline/pipeline-header";
import { SyncStatePanel } from "@/components/pipeline/sync-state-panel";
import { StreamTable } from "@/components/pipeline/stream-table";
import { RecentExecutions } from "@/components/pipeline/recent-executions";

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export default function PipelineDetailPage() {
  const params = useParams<{ pipelineId: string }>();
  const pipelineId = decodeURIComponent(params.pipelineId);
  const { pipeline, isLoading, error, mutate } = usePipeline(pipelineId);
  const { data: session } = useSession();
  const isAdmin = session?.user?.groups?.includes("Admin") ?? false;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
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
        <DetailSkeleton />
      ) : !pipeline ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border p-8 text-center text-muted-foreground">
          <p className="font-medium">Pipeline not found</p>
          <p className="text-sm">
            This pipeline may have been removed or you don&apos;t have access.
          </p>
        </div>
      ) : (
        <>
          <PipelineHeader pipeline={pipeline} isAdmin={isAdmin} onTriggered={() => mutate()} />
          <SyncStatePanel syncState={pipeline.syncState} />
          {pipeline.syncState && (
            <StreamTable streams={pipeline.syncState.streams} pipelineId={pipeline.pipelineId} />
          )}
          <RecentExecutions
            executions={pipeline.recentExecutions}
            pipelineId={pipeline.pipelineId}
          />
          <div className="flex items-center gap-4">
            <Link
              href={`/pipelines/${encodeURIComponent(pipeline.pipelineId)}/streams`}
              className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
            >
              <Database className="size-4" />
              View Streams
            </Link>
            <Link
              href={`/pipelines/${encodeURIComponent(pipeline.pipelineId)}/metrics`}
              className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
            >
              <BarChart3 className="size-4" />
              View Metrics
            </Link>
            <Link
              href={`/pipelines/${encodeURIComponent(pipeline.pipelineId)}/logs`}
              className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
            >
              <FileText className="size-4" />
              View Logs
            </Link>
            {isAdmin && (
              <Link
                href={`/pipelines/${encodeURIComponent(pipeline.pipelineId)}/alerts`}
                className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
              >
                <Bell className="size-4" />
                Alert Settings
              </Link>
            )}
          </div>
        </>
      )}
    </div>
  );
}
