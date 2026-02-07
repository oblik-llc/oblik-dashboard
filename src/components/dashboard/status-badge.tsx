"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PipelineStatus } from "@/lib/types/api";

const statusStyles: Record<PipelineStatus, string> = {
  healthy: "bg-emerald-100 text-emerald-700",
  failing: "bg-red-100 text-red-700",
  running: "bg-blue-100 text-blue-700 animate-pulse",
  unknown: "bg-zinc-100 text-zinc-600",
};

export function StatusBadge({ status }: { status: PipelineStatus }) {
  return (
    <Badge className={cn(statusStyles[status])}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}
