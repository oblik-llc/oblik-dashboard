"use client";

import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { TriggerSyncButton } from "@/components/pipeline/trigger-sync-button";
import { formatDistanceToNow } from "date-fns";
import type { PipelineDetailResponse } from "@/lib/types/api";

interface PipelineHeaderProps {
  pipeline: PipelineDetailResponse;
  isAdmin: boolean;
  onTriggered: () => void;
}

export function PipelineHeader({
  pipeline,
  isAdmin,
  onTriggered,
}: PipelineHeaderProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">
            {pipeline.clientName}
            <span className="text-muted-foreground font-normal"> / </span>
            {pipeline.connectorType}
          </h1>
          <StatusBadge status={pipeline.status} />
          {!pipeline.enabled && (
            <Badge variant="outline" className="text-muted-foreground">
              Disabled
            </Badge>
          )}
        </div>

        <TriggerSyncButton
          pipelineId={pipeline.pipelineId}
          pipelineName={`${pipeline.clientName} / ${pipeline.connectorType}`}
          isAdmin={isAdmin}
          isDisabled={!pipeline.enabled}
          isRunning={pipeline.isCurrentlyRunning}
          onTriggered={onTriggered}
        />
      </div>

      <div className="text-muted-foreground flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <span>
          <span className="font-medium text-foreground">Schedule:</span>{" "}
          {pipeline.scheduleExpression}
        </span>
        <span>
          <span className="font-medium text-foreground">Destination:</span>{" "}
          {pipeline.destinationType}
        </span>
        <span>
          <span className="font-medium text-foreground">Environment:</span>{" "}
          {pipeline.environment}
        </span>
        {pipeline.lastSync && (
          <span>
            <span className="font-medium text-foreground">Last sync:</span>{" "}
            {formatDistanceToNow(new Date(pipeline.lastSync.timestamp), {
              addSuffix: true,
            })}
          </span>
        )}
      </div>
    </div>
  );
}
