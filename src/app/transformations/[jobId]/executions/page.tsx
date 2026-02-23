"use client";

import { useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AlertCircle, RefreshCw, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useTransformationExecutions } from "@/hooks/use-transformation-executions";
import {
  StatusIcon,
  formatDuration,
  executionIdFromArn,
} from "@/components/pipeline/execution-helpers";
import type { ExecutionSummaryResponse } from "@/lib/types/api";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "SUCCEEDED", label: "Succeeded" },
  { value: "FAILED", label: "Failed" },
  { value: "RUNNING", label: "Running" },
  { value: "TIMED_OUT", label: "Timed Out" },
  { value: "ABORTED", label: "Aborted" },
] as const;

function ExecutionsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

export default function TransformationExecutionHistoryPage() {
  const params = useParams<{ jobId: string }>();
  const jobId = decodeURIComponent(params.jobId);

  const [statusFilter, setStatusFilter] = useState("");
  const [accumulated, setAccumulated] = useState<ExecutionSummaryResponse[]>(
    []
  );
  const [currentToken, setCurrentToken] = useState<string | undefined>(
    undefined
  );

  const { data, isLoading, error, mutate } = useTransformationExecutions(
    jobId,
    statusFilter || undefined,
    currentToken
  );

  const executions =
    currentToken && accumulated.length > 0
      ? [...accumulated, ...(data?.executions ?? [])]
      : (data?.executions ?? []);

  const handleFilterChange = useCallback(
    (value: string) => {
      setStatusFilter(value);
      setAccumulated([]);
      setCurrentToken(undefined);
    },
    []
  );

  const handleLoadMore = useCallback(() => {
    if (data?.nextToken) {
      setAccumulated(executions);
      setCurrentToken(data.nextToken);
    }
  }, [data?.nextToken, executions]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Execution History
          </h1>
          <p className="text-muted-foreground text-sm">{jobId}</p>
        </div>
        <Link
          href={`/transformations/${encodeURIComponent(jobId)}`}
          className="text-sm text-blue-600 hover:underline"
        >
          Back to job
        </Link>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Executions</CardTitle>
          <select
            value={statusFilter}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="flex flex-col items-center gap-4 rounded-lg border border-red-200 bg-red-50 p-8 text-center">
              <AlertCircle className="size-8 text-red-500" />
              <div>
                <p className="font-medium text-red-800">
                  Failed to load executions
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
          ) : isLoading && accumulated.length === 0 ? (
            <ExecutionsSkeleton />
          ) : executions.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border p-8 text-center text-muted-foreground">
              <p className="font-medium">No executions found</p>
              <p className="text-sm">
                {statusFilter
                  ? "Try changing the status filter."
                  : "This job has no execution history yet."}
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">Status</TableHead>
                    <TableHead>Execution ID</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead className="text-right">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {executions.map((exec) => {
                    const executionId = executionIdFromArn(exec.executionArn);
                    return (
                      <TableRow key={exec.executionArn}>
                        <TableCell>
                          <StatusIcon status={exec.status} />
                        </TableCell>
                        <TableCell
                          className="max-w-[200px] truncate font-mono text-xs"
                          title={executionId}
                        >
                          {executionId}
                        </TableCell>
                        <TableCell>
                          {formatDistanceToNow(new Date(exec.startDate), {
                            addSuffix: true,
                          })}
                        </TableCell>
                        <TableCell>
                          {formatDuration(exec.startDate, exec.stopDate)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Link
                            href={`/transformations/${encodeURIComponent(jobId)}/executions/${encodeURIComponent(executionId)}`}
                            className="text-sm text-blue-600 hover:underline"
                          >
                            View
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {data?.nextToken && (
                <div className="mt-4 flex justify-center">
                  <Button
                    variant="outline"
                    onClick={handleLoadMore}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : null}
                    Load More
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
