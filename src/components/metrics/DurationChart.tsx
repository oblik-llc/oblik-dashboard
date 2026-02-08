"use client";

import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import type { MetricDataPointResponse } from "@/lib/types/api";

interface DurationChartProps {
  executionTime: MetricDataPointResponse[];
}

interface DurationDataPoint {
  timestamp: string;
  dateLabel: string;
  durationMs: number;
  durationLabel: string;
}

function formatDurationMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = seconds / 60;
  if (minutes < 60) return `${minutes.toFixed(1)}m`;
  const hours = minutes / 60;
  return `${hours.toFixed(1)}h`;
}

function formatYAxisDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = seconds / 60;
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = minutes / 60;
  return `${hours.toFixed(1)}h`;
}

export function DurationChart({ executionTime }: DurationChartProps) {
  const data = useMemo(() => {
    return executionTime
      .map((point): DurationDataPoint => ({
        timestamp: point.timestamp,
        dateLabel: format(parseISO(point.timestamp), "MMM d"),
        durationMs: point.value,
        durationLabel: formatDurationMs(point.value),
      }))
      .sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
  }, [executionTime]);

  const isEmpty = data.length === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Execution Duration</CardTitle>
        <CardDescription>
          Average execution time per period
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
            No duration data available for this period
          </div>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data}
                margin={{ top: 4, right: 12, bottom: 4, left: -8 }}
              >
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
                />
                <YAxis
                  tickFormatter={formatYAxisDuration}
                  tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  dx={-4}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--color-popover)",
                    borderColor: "var(--color-border)",
                    borderRadius: "var(--radius-md)",
                    color: "var(--color-popover-foreground)",
                    fontSize: 13,
                  }}
                  labelFormatter={(_, payload) => {
                    if (payload?.[0]?.payload?.timestamp) {
                      return format(
                        parseISO(payload[0].payload.timestamp),
                        "MMM d, h:mm a"
                      );
                    }
                    return "";
                  }}
                  formatter={(value?: number | string) => [
                    formatDurationMs(Number(value ?? 0)),
                    "Avg Duration",
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="durationMs"
                  name="Avg Duration"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
