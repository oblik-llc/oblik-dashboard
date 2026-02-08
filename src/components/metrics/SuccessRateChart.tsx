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
  Legend,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import type { MetricDataPointResponse } from "@/lib/types/api";

interface SuccessRateChartProps {
  succeeded: MetricDataPointResponse[];
  failed: MetricDataPointResponse[];
}

interface MergedDataPoint {
  timestamp: string;
  dateLabel: string;
  succeeded: number;
  failed: number;
}

export function SuccessRateChart({
  succeeded,
  failed,
}: SuccessRateChartProps) {
  const data = useMemo(() => {
    const map = new Map<string, MergedDataPoint>();

    for (const point of succeeded) {
      const key = point.timestamp;
      const existing = map.get(key);
      if (existing) {
        existing.succeeded = point.value;
      } else {
        map.set(key, {
          timestamp: key,
          dateLabel: format(parseISO(key), "MMM d"),
          succeeded: point.value,
          failed: 0,
        });
      }
    }

    for (const point of failed) {
      const key = point.timestamp;
      const existing = map.get(key);
      if (existing) {
        existing.failed = point.value;
      } else {
        map.set(key, {
          timestamp: key,
          dateLabel: format(parseISO(key), "MMM d"),
          succeeded: 0,
          failed: point.value,
        });
      }
    }

    return Array.from(map.values()).sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, [succeeded, failed]);

  const isEmpty = data.length === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Execution Results</CardTitle>
        <CardDescription>
          Succeeded and failed execution counts over time
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
            No execution data available for this period
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
                  allowDecimals={false}
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
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 12, paddingBottom: 8 }}
                />
                <Line
                  type="monotone"
                  dataKey="succeeded"
                  name="Succeeded"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
                <Line
                  type="monotone"
                  dataKey="failed"
                  name="Failed"
                  stroke="#ef4444"
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
