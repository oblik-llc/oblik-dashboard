"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import type { PipelineAnalyticsResponse } from "@/lib/types/api";

interface FreshnessChartProps {
  analytics: PipelineAnalyticsResponse;
  executions: { startDate: string; stopDate: string | null; status: string }[];
}

interface DataPoint {
  dateLabel: string;
  gapMinutes: number;
  timestamp: number;
}

export function FreshnessChart({
  analytics,
  executions,
}: FreshnessChartProps) {
  const freshnessWindow = analytics.slaConfig?.freshnessWindowMinutes;

  const data = useMemo(() => {
    const succeeded = executions
      .filter((e) => e.status === "SUCCEEDED" && e.stopDate)
      .map((e) => ({
        stopDate: new Date(e.stopDate!).getTime(),
      }))
      .sort((a, b) => a.stopDate - b.stopDate);

    if (succeeded.length < 2) return [];

    const points: DataPoint[] = [];
    for (let i = 1; i < succeeded.length; i++) {
      const gap = (succeeded[i].stopDate - succeeded[i - 1].stopDate) / 60_000;
      const date = new Date(succeeded[i].stopDate);
      points.push({
        dateLabel: `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`,
        gapMinutes: Math.round(gap * 10) / 10,
        timestamp: succeeded[i].stopDate,
      });
    }

    return points;
  }, [executions]);

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sync Freshness</CardTitle>
          <CardDescription>
            Time gap between successful syncs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
            Not enough successful executions to chart freshness
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sync Freshness</CardTitle>
        <CardDescription>
          Time gap between successful syncs (minutes)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="var(--color-border)"
              />
              <XAxis
                dataKey="dateLabel"
                tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                dy={8}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                dx={-4}
                label={{
                  value: "min",
                  position: "insideTopLeft",
                  offset: -4,
                  style: {
                    fontSize: 11,
                    fill: "var(--color-muted-foreground)",
                  },
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--color-popover)",
                  borderColor: "var(--color-border)",
                  borderRadius: "var(--radius-md)",
                  color: "var(--color-popover-foreground)",
                  fontSize: 13,
                }}
                formatter={(value?: number | string) => [
                  `${value} min`,
                  "Gap",
                ]}
              />
              <Area
                type="monotone"
                dataKey="gapMinutes"
                fill="#3b82f6"
                fillOpacity={0.1}
                stroke="none"
              />
              <Line
                type="monotone"
                dataKey="gapMinutes"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0, fill: "#3b82f6" }}
              />
              {freshnessWindow && (
                <ReferenceLine
                  y={freshnessWindow}
                  stroke="#ef4444"
                  strokeDasharray="6 4"
                  strokeWidth={1.5}
                  label={{
                    value: `SLA: ${freshnessWindow}min`,
                    position: "insideTopRight",
                    style: {
                      fontSize: 11,
                      fill: "#ef4444",
                      fontWeight: 500,
                    },
                  }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        {freshnessWindow && (
          <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-4 bg-blue-500" />
              Gap between syncs
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-4 border-t-2 border-dashed border-red-500" />
              SLA threshold
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
