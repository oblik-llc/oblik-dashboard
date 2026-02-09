"use client";

import { useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
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
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { ExecutionsSkeleton } from "@/components/loading/executions-skeleton";
import { useExecutions } from "@/hooks/use-executions";
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

export default function ExecutionHistoryPage() {
  const params = useParams<{ pipelineId: string }>();
  const pipelineId = decodeURIComponent(params.pipelineId);

  const [statusFilter, setStatusFilter] = useState("");
  const [accumulated, setAccumulated] = useState<ExecutionSummaryResponse[]>(
    []
  );
  const [currentToken, setCurrentToken] = useState<string | undefined>(
    undefined
  );

  const { data, isLoading, error, mutate } = useExecutions(
    pipelineId,
    statusFilter || undefined,
    currentToken
  );

  // Merge newly fetched data into accumulated list
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
          <p className="text-muted-foreground text-sm">{pipelineId}</p>
        </div>
        <Link
          href={`/pipelines/${encodeURIComponent(pipelineId)}`}
          className="text-sm text-blue-600 hover:underline"
        >
          Back to pipeline
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
            <ErrorState
              title="Failed to load executions"
              message={error.message || "An unexpected error occurred."}
              onRetry={() => mutate()}
            />
          ) : isLoading && accumulated.length === 0 ? (
            <ExecutionsSkeleton />
          ) : executions.length === 0 ? (
            <EmptyState
              title="No executions found"
              description={
                statusFilter
                  ? "Try changing the status filter."
                  : "This pipeline has no execution history yet."
              }
            />
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
                            href={`/pipelines/${encodeURIComponent(pipelineId)}/executions/${encodeURIComponent(executionId)}`}
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
