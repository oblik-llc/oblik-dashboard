"use client";

import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { TriggerTransformationButton } from "@/components/transformation/trigger-transformation-button";
import { TriggerBadge } from "@/components/transformation/transformation-card";
import { formatDistanceToNow } from "date-fns";
import type { TransformationJobDetailResponse } from "@/lib/types/api";

interface TransformationHeaderProps {
  job: TransformationJobDetailResponse;
  isAdmin: boolean;
  onTriggered: () => void;
}

export function TransformationHeader({
  job,
  isAdmin,
  onTriggered,
}: TransformationHeaderProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">
            {job.clientName}
            <span className="text-muted-foreground font-normal"> / </span>
            {job.jobName}
          </h1>
          <StatusBadge status={job.status} />
          <TriggerBadge triggerType={job.triggerType} />
          {!job.enabled && (
            <Badge variant="outline" className="text-muted-foreground">
              Disabled
            </Badge>
          )}
        </div>

        <TriggerTransformationButton
          jobId={job.jobId}
          jobName={`${job.clientName} / ${job.jobName}`}
          isAdmin={isAdmin}
          isDisabled={!job.enabled}
          isRunning={job.isCurrentlyRunning}
          onTriggered={onTriggered}
        />
      </div>

      <div className="text-muted-foreground flex flex-wrap gap-x-6 gap-y-1 text-sm">
        {job.scheduleExpression && (
          <span>
            <span className="font-medium text-foreground">Schedule:</span>{" "}
            {job.scheduleExpression}
          </span>
        )}
        <span>
          <span className="font-medium text-foreground">Trigger:</span>{" "}
          {job.triggerType}
        </span>
        <span>
          <span className="font-medium text-foreground">Commands:</span>{" "}
          {job.dbtCommands.length}
        </span>
        {job.lastRun && (
          <span>
            <span className="font-medium text-foreground">Last run:</span>{" "}
            {formatDistanceToNow(new Date(job.lastRun.timestamp), {
              addSuffix: true,
            })}
          </span>
        )}
      </div>
    </div>
  );
}
