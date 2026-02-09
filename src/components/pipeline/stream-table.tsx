"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { StreamSummary } from "@/lib/types/api";

interface StreamTableProps {
  streams: StreamSummary[];
  pipelineId: string;
}

export function StreamTable({ streams, pipelineId }: StreamTableProps) {
  if (streams.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Streams</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No stream data available
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Streams</CardTitle>
        <Link
          href={`/pipelines/${encodeURIComponent(pipelineId)}/streams`}
          className="text-sm text-blue-600 hover:underline"
        >
          View all
        </Link>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Stream Name</TableHead>
              <TableHead className="text-right">Records</TableHead>
              <TableHead>Cursor Field</TableHead>
              <TableHead>Cursor Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {streams.map((stream) => (
              <TableRow key={stream.name}>
                <TableCell className="font-medium">{stream.name}</TableCell>
                <TableCell className="text-right">
                  {stream.recordCount?.toLocaleString() ?? "--"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {stream.cursorField ?? "--"}
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {stream.cursorValue ?? "--"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
