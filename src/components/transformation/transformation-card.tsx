"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Code2, Clock, Calendar, Zap } from "lucide-react";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/dashboard/status-badge";
import type { TransformationJobOverview } from "@/lib/types/api";

const triggerIcons: Record<string, typeof Clock> = {
  cron: Calendar,
  event: Zap,
  manual: Clock,
};

interface TransformationCardProps {
  job: TransformationJobOverview;
}

export function TransformationCard({ job }: TransformationCardProps) {
  const TriggerIcon = triggerIcons[job.triggerType] ?? Clock;

  return (
    <Link href={`/transformations/${encodeURIComponent(job.jobId)}`}>
      <Card className="transition-all hover:border-zinc-300 hover:shadow-md">
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2">
              <Code2 className="size-4 text-muted-foreground" />
              {job.clientName}
            </CardTitle>
            <CardDescription>{job.jobName}</CardDescription>
          </div>
          <CardAction>
            <StatusBadge status={job.status} />
          </CardAction>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div>
              <dt className="text-muted-foreground">Trigger</dt>
              <dd className="flex items-center gap-1.5 font-medium">
                <TriggerIcon className="size-3.5 text-muted-foreground" />
                {job.triggerType}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Last Run</dt>
              <dd className="font-medium">
                {job.lastRun
                  ? formatDistanceToNow(new Date(job.lastRun.timestamp), {
                      addSuffix: true,
                    })
                  : "\u2014"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Commands</dt>
              <dd className="truncate font-medium" title={job.dbtCommands.join(", ")}>
                {job.dbtCommands.length > 0
                  ? job.dbtCommands[0]
                  : "\u2014"}
                {job.dbtCommands.length > 1 && (
                  <span className="text-muted-foreground">
                    {" "}+{job.dbtCommands.length - 1}
                  </span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Duration</dt>
              <dd className="font-medium">
                {job.lastRun?.durationSeconds != null
                  ? formatDurationShort(job.lastRun.durationSeconds)
                  : "\u2014"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Success Rate</dt>
              <dd className="font-medium">
                {Math.round(job.recentSuccessRate * 100)}%
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Schedule</dt>
              <dd className="truncate font-medium">
                {job.scheduleExpression ?? "\u2014"}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </Link>
  );
}

function formatDurationShort(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.round(seconds % 60);
  return remaining > 0 ? `${minutes}m ${remaining}s` : `${minutes}m`;
}

export function TransformationCardSkeleton() {
  return (
    <Card className="py-6">
      <CardHeader>
        <div>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mt-2 h-4 w-20" />
        </div>
        <CardAction>
          <Skeleton className="h-5 w-16 rounded-full" />
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="h-3 w-16" />
              <Skeleton className="mt-1.5 h-4 w-20" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function TriggerBadge({ triggerType }: { triggerType: string }) {
  const colors: Record<string, string> = {
    cron: "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400",
    event: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
    manual: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  };

  return (
    <Badge className={colors[triggerType] ?? colors.manual}>
      {triggerType}
    </Badge>
  );
}
