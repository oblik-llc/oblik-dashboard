"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  Database,
  FileSpreadsheet,
  Globe,
  HardDrive,
} from "lucide-react";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "./status-badge";
import type { PipelineOverview } from "@/lib/types/api";

function ConnectorIcon({ connectorType, className }: { connectorType: string; className?: string }) {
  const key = connectorType.toLowerCase();
  if (key.includes("spreadsheet")) return <FileSpreadsheet className={className} />;
  if (key.includes("api")) return <Globe className={className} />;
  if (key.includes("file")) return <HardDrive className={className} />;
  return <Database className={className} />;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.round(seconds % 60);
  return remaining > 0 ? `${minutes}m ${remaining}s` : `${minutes}m`;
}

interface PipelineCardProps {
  pipeline: PipelineOverview;
}

export function PipelineCard({ pipeline }: PipelineCardProps) {
  return (
    <Link href={`/pipelines/${encodeURIComponent(pipeline.pipelineId)}`}>
      <Card className="transition-all hover:border-zinc-300 hover:shadow-md">
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2">
              <ConnectorIcon connectorType={pipeline.connectorType} className="size-4 text-muted-foreground" />
              {pipeline.connectorType}
            </CardTitle>
            <CardDescription>{pipeline.environment}</CardDescription>
          </div>
          <CardAction>
            <StatusBadge status={pipeline.status} />
          </CardAction>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div>
              <dt className="text-muted-foreground">Schedule</dt>
              <dd className="font-medium">{pipeline.scheduleExpression}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Last Sync</dt>
              <dd className="font-medium">
                {pipeline.lastSync
                  ? formatDistanceToNow(new Date(pipeline.lastSync.timestamp), {
                      addSuffix: true,
                    })
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Records</dt>
              <dd className="font-medium">
                {pipeline.lastSync?.recordCount != null
                  ? pipeline.lastSync.recordCount.toLocaleString()
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Duration</dt>
              <dd className="font-medium">
                {pipeline.lastSync?.durationSeconds != null
                  ? formatDuration(pipeline.lastSync.durationSeconds)
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Success Rate</dt>
              <dd className="font-medium">
                {Math.round(pipeline.recentSuccessRate * 100)}%
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Next Run</dt>
              <dd className="font-medium">
                {pipeline.nextRunAt
                  ? formatDistanceToNow(new Date(pipeline.nextRunAt), {
                      addSuffix: true,
                    })
                  : "—"}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </Link>
  );
}

export function PipelineCardSkeleton() {
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
