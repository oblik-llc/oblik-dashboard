"use client";

import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
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
import type { ExecutionRecordDataPoint } from "@/lib/types/api";

interface RecordsSyncedChartProps {
  dataPoints: ExecutionRecordDataPoint[];
}

interface ChartDataPoint {
  executionName: string;
  dateLabel: string;
  startDate: string;
  recordCount: number;
  status: string;
  durationLabel: string;
}

const STATUS_COLORS: Record<string, string> = {
  SUCCEEDED: "#22c55e",
  FAILED: "#ef4444",
  TIMED_OUT: "#f59e0b",
  ABORTED: "#6b7280",
};

function formatDurationShort(seconds: number | null): string {
  if (seconds == null) return "--";
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remaining}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

export function RecordsSyncedChart({ dataPoints }: RecordsSyncedChartProps) {
  const data = useMemo(() => {
    return dataPoints
      .filter((dp) => dp.recordCount != null)
      .map(
        (dp): ChartDataPoint => ({
          executionName: dp.executionName,
          dateLabel: format(parseISO(dp.startDate), "MMM d HH:mm"),
          startDate: dp.startDate,
          recordCount: dp.recordCount!,
          status: dp.status,
          durationLabel: formatDurationShort(dp.durationSeconds),
        })
      )
      .reverse(); // chronological order (oldest first)
  }, [dataPoints]);

  const isEmpty = data.length === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Records Synced per Run</CardTitle>
        <CardDescription>
          Record count from each completed execution
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
            No record count data available
          </div>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
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
                  allowDecimals={false}
                  tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  dx={-4}
                  tickFormatter={(v: number) => v.toLocaleString()}
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
                  formatter={(value?: number | string) => [
                    `${Number(value ?? 0).toLocaleString()} records`,
                    "Count",
                  ]}
                  cursor={{ fill: "var(--color-muted)", opacity: 0.3 }}
                />
                <Bar dataKey="recordCount" maxBarSize={32} radius={[3, 3, 0, 0]}>
                  {data.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={STATUS_COLORS[entry.status] ?? "#6b7280"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
