"use client";

import { useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import { Layers, Database, Clock } from "lucide-react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import type { StreamSummary } from "@/lib/types/api";

interface StreamStatsProps {
  streams: StreamSummary[];
  lastSyncTimestamp: string | null;
}

export function StreamStats({ streams, lastSyncTimestamp }: StreamStatsProps) {
  const { totalRecords, incrementalCount, fullRefreshCount } = useMemo(() => {
    let total = 0;
    let inc = 0;
    let full = 0;
    for (const s of streams) {
      if (s.recordCount != null) total += s.recordCount;
      if (s.syncMode === "incremental") inc++;
      else full++;
    }
    return { totalRecords: total, incrementalCount: inc, fullRefreshCount: full };
  }, [streams]);

  const freshnessLabel = lastSyncTimestamp
    ? formatDistanceToNow(new Date(lastSyncTimestamp), { addSuffix: true })
    : "--";

  const stats = [
    {
      label: "Total Streams",
      value: streams.length.toLocaleString(),
      icon: Layers,
    },
    {
      label: "Total Records",
      value: totalRecords.toLocaleString(),
      icon: Database,
    },
    {
      label: "Data Freshness",
      value: freshnessLabel,
      icon: Clock,
    },
  ];

  const breakdownParts: string[] = [];
  if (incrementalCount > 0)
    breakdownParts.push(`${incrementalCount} incremental`);
  if (fullRefreshCount > 0)
    breakdownParts.push(`${fullRefreshCount} full refresh`);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                <stat.icon className="size-5 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">
                  {stat.label}
                </p>
                <p className="truncate text-lg font-semibold tracking-tight">
                  {stat.value}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {breakdownParts.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {breakdownParts.join(", ")}
        </p>
      )}
    </div>
  );
}
