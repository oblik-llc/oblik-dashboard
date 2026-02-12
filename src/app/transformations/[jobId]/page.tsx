"use client";

import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { AlertCircle, RefreshCw, FileText, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTransformation } from "@/hooks/use-transformation";
import { TransformationHeader } from "@/components/transformation/transformation-header";
import { JobConfigPanel } from "@/components/transformation/job-config-panel";
import { TransformationExecutions } from "@/components/transformation/transformation-executions";

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}

export default function TransformationDetailPage() {
  const params = useParams<{ jobId: string }>();
  const jobId = decodeURIComponent(params.jobId);
  const { job, isLoading, error, mutate } = useTransformation(jobId);
  const { data: session } = useSession();
  const isAdmin = session?.user?.groups?.includes("Admin") ?? false;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      {error ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-red-200 bg-red-50 p-8 text-center">
          <AlertCircle className="size-8 text-red-500" />
          <div>
            <p className="font-medium text-red-800">
              Failed to load transformation job
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
      ) : !job ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border p-8 text-center text-muted-foreground">
          <p className="font-medium">Transformation job not found</p>
          <p className="text-sm">
            This job may have been removed or you don&apos;t have access.
          </p>
        </div>
      ) : (
        <>
          <TransformationHeader
            job={job}
            isAdmin={isAdmin}
            onTriggered={() => mutate()}
          />
          <JobConfigPanel job={job} />
          <TransformationExecutions
            executions={job.recentExecutions}
            jobId={job.jobId}
          />
          <div className="flex items-center gap-4">
            <Link
              href={`/transformations/${encodeURIComponent(job.jobId)}/executions`}
              className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
            >
              <List className="size-4" />
              All Executions
            </Link>
            <Link
              href={`/transformations/${encodeURIComponent(job.jobId)}/logs`}
              className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
            >
              <FileText className="size-4" />
              View Logs
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
