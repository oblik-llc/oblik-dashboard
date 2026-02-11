"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AnalyticsSummaryPipeline } from "@/lib/types/api";

interface PipelineSlaTableProps {
  pipelines: AnalyticsSummaryPipeline[];
}

export function PipelineSlaTable({ pipelines }: PipelineSlaTableProps) {
  if (pipelines.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pipeline SLA Status</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground py-4 text-center">
            No pipeline data available
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pipeline SLA Status</CardTitle>
        <CardDescription>
          Per-pipeline performance and compliance
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pipeline</TableHead>
              <TableHead>Client</TableHead>
              <TableHead className="text-right">Uptime</TableHead>
              <TableHead className="text-right">Freshness</TableHead>
              <TableHead className="text-right">Records</TableHead>
              <TableHead className="text-right">Executions</TableHead>
              <TableHead className="text-right">SLA</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pipelines.map((p) => (
              <TableRow key={p.pipelineId}>
                <TableCell>
                  <Link
                    href={`/pipelines/${encodeURIComponent(p.pipelineId)}/analytics`}
                    className="text-sm text-blue-600 hover:underline font-medium"
                  >
                    {p.pipelineId}
                  </Link>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {p.clientName}
                </TableCell>
                <TableCell className="text-right">
                  <span
                    className={`text-sm font-medium ${
                      p.uptimePercent >= 99
                        ? "text-emerald-600"
                        : p.uptimePercent >= 95
                          ? "text-amber-600"
                          : "text-red-600"
                    }`}
                  >
                    {p.uptimePercent}%
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  {p.freshnessPercent !== null ? (
                    <span
                      className={`text-sm font-medium ${
                        p.freshnessPercent >= 100
                          ? "text-emerald-600"
                          : "text-amber-600"
                      }`}
                    >
                      {p.freshnessPercent}%
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">N/A</span>
                  )}
                </TableCell>
                <TableCell className="text-right text-sm">
                  {formatNumber(p.totalRecordsSynced)}
                </TableCell>
                <TableCell className="text-right text-sm">
                  {p.totalExecutions}
                </TableCell>
                <TableCell className="text-right">
                  <Badge
                    variant={p.slaCompliant ? "secondary" : "destructive"}
                  >
                    {p.slaCompliant ? "OK" : "Breach"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}
