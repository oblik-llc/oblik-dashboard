"use client";

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
}

export function StreamTable({ streams }: StreamTableProps) {
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
      <CardHeader>
        <CardTitle>Streams</CardTitle>
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
