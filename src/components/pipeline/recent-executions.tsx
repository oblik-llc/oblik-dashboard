"use client";

import Link from "next/link";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
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
import { formatDistanceToNow } from "date-fns";
import type { ExecutionSummaryResponse } from "@/lib/types/api";

interface RecentExecutionsProps {
  executions: ExecutionSummaryResponse[];
  pipelineId: string;
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "SUCCEEDED":
      return <CheckCircle2 className="size-4 text-emerald-500" />;
    case "FAILED":
    case "TIMED_OUT":
    case "ABORTED":
      return <XCircle className="size-4 text-red-500" />;
    case "RUNNING":
      return <Loader2 className="size-4 animate-spin text-blue-500" />;
    default:
      return <div className="size-4 rounded-full bg-zinc-300" />;
  }
}

function formatDuration(start: string, stop: string | null): string {
  if (!stop) return "Running...";
  const ms = new Date(stop).getTime() - new Date(start).getTime();
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

// Extract execution ID from ARN (last segment after the last colon)
function executionIdFromArn(arn: string): string {
  const parts = arn.split(":");
  return parts[parts.length - 1];
}

export function RecentExecutions({
  executions,
  pipelineId,
}: RecentExecutionsProps) {
  if (executions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Executions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No executions found
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Executions</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">Status</TableHead>
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
      </CardContent>
    </Card>
  );
}
