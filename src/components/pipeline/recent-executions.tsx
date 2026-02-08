"use client";

import Link from "next/link";
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
import {
  StatusIcon,
  formatDuration,
  executionIdFromArn,
} from "@/components/pipeline/execution-helpers";

interface RecentExecutionsProps {
  executions: ExecutionSummaryResponse[];
  pipelineId: string;
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
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent Executions</CardTitle>
        <Link
          href={`/pipelines/${encodeURIComponent(pipelineId)}/executions`}
          className="text-sm text-blue-600 hover:underline"
        >
          View all executions
        </Link>
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
