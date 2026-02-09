"use client";

import { useState, useCallback } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import type { StreamSummary } from "@/lib/types/api";

interface EnhancedStreamTableProps {
  streams: StreamSummary[];
}

export function EnhancedStreamTable({ streams }: EnhancedStreamTableProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpanded = useCallback((name: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  if (streams.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Stream Details</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No stream data available
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stream Details</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>Stream Name</TableHead>
              <TableHead>Sync Mode</TableHead>
              <TableHead className="text-right">Records</TableHead>
              <TableHead>Cursor Field</TableHead>
              <TableHead>Cursor Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {streams.map((stream) => {
              const isExpanded = expanded.has(stream.name);
              const hasState =
                stream.streamState != null &&
                Object.keys(stream.streamState).length > 0;

              return (
                <TableRow key={stream.name} className="group">
                  <TableCell className="w-8 px-2">
                    {hasState ? (
                      <button
                        onClick={() => toggleExpanded(stream.name)}
                        className="flex size-6 items-center justify-center rounded transition-colors hover:bg-muted"
                        aria-label={
                          isExpanded ? "Collapse state" : "Expand state"
                        }
                      >
                        {isExpanded ? (
                          <ChevronDown className="size-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="size-4 text-muted-foreground" />
                        )}
                      </button>
                    ) : null}
                  </TableCell>
                  <TableCell className="font-medium">{stream.name}</TableCell>
                  <TableCell>
                    {stream.syncMode === "incremental" ? (
                      <Badge className="bg-emerald-100 text-emerald-700">
                        Incremental
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Full Refresh</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {stream.recordCount?.toLocaleString() ?? "--"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {stream.cursorField ?? "--"}
                  </TableCell>
                  <TableCell className="max-w-48 truncate font-mono text-xs text-muted-foreground">
                    {stream.cursorValue ?? "--"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {/* Expanded state panels render below the table */}
        {streams
          .filter(
            (s) =>
              expanded.has(s.name) &&
              s.streamState != null &&
              Object.keys(s.streamState).length > 0
          )
          .map((stream) => (
            <div
              key={`state-${stream.name}`}
              className="border-t bg-muted/30 px-6 py-4"
            >
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Stream state for{" "}
                <span className="font-semibold text-foreground">
                  {stream.name}
                </span>
              </p>
              <pre className="overflow-x-auto rounded-md bg-zinc-950 p-4 font-mono text-xs leading-relaxed text-zinc-300">
                {JSON.stringify(stream.streamState, null, 2)}
              </pre>
            </div>
          ))}
      </CardContent>
    </Card>
  );
}
