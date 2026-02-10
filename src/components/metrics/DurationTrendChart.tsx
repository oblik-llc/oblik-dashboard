"use client";

import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { formatDurationMs, formatYAxisDuration } from "@/lib/format";
import { percentile } from "@/lib/stats";
import type { ExecutionRecordDataPoint } from "@/lib/types/api";

interface DurationTrendChartProps {
  dataPoints: ExecutionRecordDataPoint[];
}

interface ChartDataPoint {
  executionName: string;
  dateLabel: string;
  startDate: string;
  durationMs: number;
  status: string;
}

const STATUS_COLORS: Record<string, string> = {
  SUCCEEDED: "#3b82f6",
  FAILED: "#ef4444",
  TIMED_OUT: "#f59e0b",
  ABORTED: "#6b7280",
};

export function DurationTrendChart({ dataPoints }: DurationTrendChartProps) {
  const { data, p50, p90, p99 } = useMemo(() => {
    const filtered = dataPoints.filter((dp) => dp.durationSeconds != null);

    const chartData = filtered
      .map(
        (dp): ChartDataPoint => ({
          executionName: dp.executionName,
          dateLabel: format(parseISO(dp.startDate), "MMM d HH:mm"),
          startDate: dp.startDate,
          durationMs: dp.durationSeconds! * 1000,
          status: dp.status,
        })
      )
      .reverse(); // chronological order

    const durations = chartData.map((d) => d.durationMs);

    return {
      data: chartData,
      p50: percentile(durations, 50),
      p90: percentile(durations, 90),
      p99: percentile(durations, 99),
    };
  }, [dataPoints]);

  const isEmpty = data.length === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Duration Trend</CardTitle>
        <CardDescription>
          Individual execution durations with p50 / p90 / p99 percentiles
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
            No duration data available
          </div>
        ) : (
          <>
            <div className="mb-2 flex items-center justify-end gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-px w-3 border-t-2 border-dashed border-green-500" />
                p50 {formatDurationMs(p50)}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-px w-3 border-t-2 border-dashed border-amber-500" />
                p90 {formatDurationMs(p90)}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-px w-3 border-t-2 border-dashed border-red-500" />
                p99 {formatDurationMs(p99)}
              </span>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
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
                    tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                    dy={8}
                    interval="preserveStartEnd"
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
                      const p = payload?.[0]?.payload as ChartDataPoint | undefined;
                      if (!p) return "";
                      return format(parseISO(p.startDate), "MMM d, yyyy h:mm a");
                    }}
                    formatter={(value: number | undefined) => [
                      formatDurationMs(Number(value ?? 0)),
                      "Duration",
                    ]}
                    cursor={{ fill: "var(--color-muted)", opacity: 0.3 }}
                  />
                  <ReferenceLine
                    y={p50}
                    stroke="#22c55e"
                    strokeDasharray="6 3"
                    strokeWidth={1.5}
                  />
                  <ReferenceLine
                    y={p90}
                    stroke="#f59e0b"
                    strokeDasharray="6 3"
                    strokeWidth={1.5}
                  />
                  <ReferenceLine
                    y={p99}
                    stroke="#ef4444"
                    strokeDasharray="6 3"
                    strokeWidth={1.5}
                  />
                  <Bar dataKey="durationMs" maxBarSize={32} radius={[3, 3, 0, 0]}>
                    {data.map((entry, index) => (
                      <Cell
                        key={index}
                        fill={STATUS_COLORS[entry.status] ?? "#6b7280"}
                      />
                    ))}
                  </Bar>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
