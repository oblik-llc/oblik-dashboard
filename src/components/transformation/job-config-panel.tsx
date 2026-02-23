"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { TransformationJobDetailResponse } from "@/lib/types/api";

interface JobConfigPanelProps {
  job: TransformationJobDetailResponse;
}

export function JobConfigPanel({ job }: JobConfigPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Job Configuration</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-muted-foreground text-xs font-medium">
              Trigger Type
            </p>
            <p className="mt-1 text-sm font-medium">{job.triggerType}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs font-medium">
              Schedule
            </p>
            <p className="mt-1 text-sm font-medium">
              {job.scheduleExpression ?? "\u2014"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs font-medium">
              Project Path
            </p>
            <p className="mt-1 truncate text-sm font-medium font-mono" title={job.dbtProjectPath}>
              {job.dbtProjectPath}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs font-medium">CPU</p>
            <p className="mt-1 text-sm font-medium">{job.cpu} vCPU</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs font-medium">Memory</p>
            <p className="mt-1 text-sm font-medium">{job.memory} MB</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs font-medium">
              Success Rate
            </p>
            <p className="mt-1 text-sm font-medium">
              {Math.round(job.recentSuccessRate * 100)}%
            </p>
          </div>
        </div>

        <div className="mt-4 border-t pt-4">
          <p className="text-muted-foreground text-xs font-medium mb-2">
            dbt Commands
          </p>
          <div className="flex flex-wrap gap-1.5">
            {job.dbtCommands.map((cmd, i) => (
              <Badge
                key={i}
                variant="secondary"
                className="font-mono text-xs"
              >
                {cmd}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
