"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { usePipeline } from "@/hooks/use-pipeline";
import { PipelineDetailSkeleton } from "@/components/loading/pipeline-detail-skeleton";
import { PipelineHeader } from "@/components/pipeline/pipeline-header";
import { SyncStatePanel } from "@/components/pipeline/sync-state-panel";
import { StreamTable } from "@/components/pipeline/stream-table";
import { RecentExecutions } from "@/components/pipeline/recent-executions";

export default function PipelineDetailPage() {
  const params = useParams<{ pipelineId: string }>();
  const pipelineId = decodeURIComponent(params.pipelineId);
  const { pipeline, isLoading, error, mutate } = usePipeline(pipelineId);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      {error ? (
        <ErrorState
          title="Failed to load pipeline"
          message={error.message || "An unexpected error occurred."}
          onRetry={() => mutate()}
        />
      ) : isLoading ? (
        <PipelineDetailSkeleton />
      ) : !pipeline ? (
        <EmptyState
          title="Pipeline not found"
          description="This pipeline may have been removed or you don't have access."
        />
      ) : (
        <>
          <PipelineHeader pipeline={pipeline} />
          <SyncStatePanel syncState={pipeline.syncState} />
          {pipeline.syncState && (
            <StreamTable streams={pipeline.syncState.streams} />
          )}
          <RecentExecutions
            executions={pipeline.recentExecutions}
            pipelineId={pipeline.pipelineId}
          />
          <Link
            href={`/pipelines/${encodeURIComponent(pipeline.pipelineId)}/metrics`}
            className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
          >
            <BarChart3 className="size-4" />
            View Metrics
          </Link>
        </>
      )}
    </div>
  );
}
