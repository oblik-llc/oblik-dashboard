"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronDown,
  ChevronRight,
  Clock,
  ArrowLeft,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { ExecutionDetailSkeleton } from "@/components/loading/execution-detail-skeleton";
import { useExecutionDetail } from "@/hooks/use-execution-detail";
import {
  StatusIcon,
  formatDuration,
} from "@/components/pipeline/execution-helpers";
import type { ExecutionHistoryEventResponse } from "@/lib/types/api";

function statusBadgeVariant(status: string) {
  switch (status) {
    case "SUCCEEDED":
      return "secondary" as const;
    case "FAILED":
    case "TIMED_OUT":
    case "ABORTED":
      return "destructive" as const;
    default:
      return "outline" as const;
  }
}

function CollapsibleJson({
  title,
  json,
  defaultOpen = false,
}: {
  title: string;
  json: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  let formatted: string;
  try {
    formatted = JSON.stringify(JSON.parse(json), null, 2);
  } catch {
    formatted = json;
  }

  return (
    <Card>
      <CardHeader
        className="cursor-pointer select-none"
        onClick={() => setOpen(!open)}
      >
        <CardTitle className="flex items-center gap-2 text-sm">
          {open ? (
            <ChevronDown className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          )}
          {title}
        </CardTitle>
      </CardHeader>
      {open && (
        <CardContent>
          <pre className="overflow-x-auto rounded-md bg-muted p-4 text-xs">
            {formatted}
          </pre>
        </CardContent>
      )}
    </Card>
  );
}

function HistoryTimeline({
  events,
}: {
  events: ExecutionHistoryEventResponse[];
}) {
  // Events come in reverse order from the API — show chronological
  const chronological = [...events].reverse();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Execution History</CardTitle>
      </CardHeader>
      <CardContent>
        {chronological.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No history events available.
          </p>
        ) : (
          <div className="relative space-y-0">
            {chronological.map((event) => (
              <div key={event.id} className="flex gap-4 pb-4">
                <div className="flex flex-col items-center">
                  <div className="mt-1 size-2 shrink-0 rounded-full bg-muted-foreground/40" />
                  <div className="w-px grow bg-border" />
                </div>
                <div className="min-w-0 flex-1 pb-2">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="font-mono text-xs font-medium">
                      {event.type}
                    </span>
                    {event.stateName && (
                      <Badge variant="secondary" className="text-xs">
                        {event.stateName}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(event.timestamp), "HH:mm:ss.SSS")}
                    </span>
                  </div>
                  {event.error && (
                    <div className="mt-1 rounded border border-red-200 bg-red-50 p-2 text-xs dark:border-red-900 dark:bg-red-950">
                      <span className="font-medium text-red-700 dark:text-red-400">
                        {event.error}
                      </span>
                      {event.cause && (
                        <p className="mt-1 whitespace-pre-wrap text-red-600 dark:text-red-300">
                          {event.cause}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ExecutionDetailPage() {
  const params = useParams<{ pipelineId: string; executionId: string }>();
  const pipelineId = decodeURIComponent(params.pipelineId);
  const executionId = decodeURIComponent(params.executionId);

  const { execution, isLoading, error, mutate } = useExecutionDetail(
    pipelineId,
    executionId
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      {/* Back link */}
      <Link
        href={`/pipelines/${encodeURIComponent(pipelineId)}/executions`}
        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
      >
        <ArrowLeft className="size-3" />
        Back to executions
      </Link>

      {error ? (
        <ErrorState
          title="Failed to load execution"
          message={error.message || "An unexpected error occurred."}
          onRetry={() => mutate()}
        />
      ) : isLoading || !execution ? (
        <ExecutionDetailSkeleton />
      ) : (
        <div className="space-y-6">
          {/* Header */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    <StatusIcon status={execution.status} />
                  </div>
                  <div className="min-w-0">
                    <h1
                      className="truncate font-mono text-lg font-semibold"
                      title={execution.name}
                    >
                      {execution.name}
                    </h1>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      <Badge variant={statusBadgeVariant(execution.status)}>
                        {execution.status}
                      </Badge>
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" />
                        {formatDuration(execution.startDate, execution.stopDate)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  <div>
                    Started{" "}
                    {format(
                      new Date(execution.startDate),
                      "MMM d, yyyy HH:mm:ss"
                    )}
                    <span className="ml-1 text-xs">
                      (
                      {formatDistanceToNow(new Date(execution.startDate), {
                        addSuffix: true,
                      })}
                      )
                    </span>
                  </div>
                  {execution.stopDate && (
                    <div>
                      Stopped{" "}
                      {format(
                        new Date(execution.stopDate),
                        "MMM d, yyyy HH:mm:ss"
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Error panel */}
          {(execution.status === "FAILED" ||
            execution.status === "TIMED_OUT" ||
            execution.status === "ABORTED") &&
            execution.error && (
              <Card className="border-red-300 dark:border-red-800">
                <CardHeader>
                  <CardTitle className="text-sm text-red-700 dark:text-red-400">
                    Error: {execution.error}
                  </CardTitle>
                </CardHeader>
                {execution.cause && (
                  <CardContent>
                    <pre className="whitespace-pre-wrap rounded-md bg-red-50 p-4 text-xs text-red-800 dark:bg-red-950 dark:text-red-200">
                      {execution.cause}
                    </pre>
                  </CardContent>
                )}
              </Card>
            )}

          {/* Output panel */}
          {execution.status === "SUCCEEDED" && execution.output && (
            <CollapsibleJson
              title="Output"
              json={execution.output}
              defaultOpen
            />
          )}

          {/* Input panel */}
          {execution.input && (
            <CollapsibleJson title="Input" json={execution.input} />
          )}

          {/* History timeline */}
          <HistoryTimeline events={execution.history} />
        </div>
      )}
    </div>
  );
}
