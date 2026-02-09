"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
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
import type { StreamSummary } from "@/lib/types/api";

interface RecordCountChartProps {
  streams: StreamSummary[];
}

export function RecordCountChart({ streams }: RecordCountChartProps) {
  const data = useMemo(() => {
    return streams
      .filter((s) => s.recordCount != null && s.recordCount > 0)
      .sort((a, b) => (b.recordCount ?? 0) - (a.recordCount ?? 0))
      .map((s) => ({
        name: s.name,
        records: s.recordCount!,
      }));
  }, [streams]);

  const isEmpty = data.length === 0;

  // Dynamic height: 40px per bar, min 200px
  const chartHeight = Math.max(data.length * 40, 200);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Record Distribution</CardTitle>
        <CardDescription>
          Record count per stream (current snapshot)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
            No record count data available
          </div>
        ) : (
          <div style={{ height: Math.min(chartHeight, 480) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 4, right: 24, bottom: 4, left: 8 }}
              >
                <XAxis
                  type="number"
                  tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => v.toLocaleString()}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={160}
                  tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--color-popover)",
                    borderColor: "var(--color-border)",
                    borderRadius: "var(--radius-md)",
                    color: "var(--color-popover-foreground)",
                    fontSize: 13,
                  }}
                  formatter={(value: number | undefined) => [
                    value != null ? value.toLocaleString() : "--",
                    "Records",
                  ]}
                  cursor={{ fill: "var(--color-muted)", opacity: 0.3 }}
                />
                <Bar dataKey="records" radius={[0, 4, 4, 0]} maxBarSize={28}>
                  {data.map((_, index) => (
                    <Cell
                      key={index}
                      fill={index === 0 ? "#3b82f6" : "#60a5fa"}
                      opacity={1 - index * 0.04}
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
