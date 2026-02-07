"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import type { SyncStateResponse } from "@/lib/types/api";

interface SyncStatePanelProps {
  syncState: SyncStateResponse | null;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

export function SyncStatePanel({ syncState }: SyncStatePanelProps) {
  if (!syncState) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sync State</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">No sync data available</p>
        </CardContent>
      </Card>
    );
  }

  const statusColor =
    syncState.lastExecutionStatus === "SUCCESS"
      ? "bg-emerald-100 text-emerald-700"
      : syncState.lastExecutionStatus === "FAILED"
        ? "bg-red-100 text-red-700"
        : "bg-zinc-100 text-zinc-600";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sync State</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-muted-foreground text-xs font-medium">
              Last Sync
            </p>
            <p className="text-sm font-medium">
              {formatDistanceToNow(new Date(syncState.lastSyncTimestamp), {
                addSuffix: true,
              })}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs font-medium">Status</p>
            <Badge className={statusColor}>
              {syncState.lastExecutionStatus}
            </Badge>
          </div>
          <div>
            <p className="text-muted-foreground text-xs font-medium">
              Total Records
            </p>
            <p className="text-sm font-medium">
              {syncState.totalRecords?.toLocaleString() ?? "--"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs font-medium">
              Duration
            </p>
            <p className="text-sm font-medium">
              {syncState.executionDuration != null
                ? formatDuration(syncState.executionDuration)
                : "--"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
