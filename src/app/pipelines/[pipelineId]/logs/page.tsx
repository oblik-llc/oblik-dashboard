"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  RefreshCw,
  Search,
  Loader2,
  Terminal,
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLogs, type LogSource } from "@/hooks/use-logs";
import { LogsSkeleton } from "@/components/loading/logs-skeleton";
import type { LogEventResponse } from "@/lib/types/api";

const LOG_SOURCES: { value: LogSource; label: string }[] = [
  { value: "ecs", label: "ECS Container" },
  { value: "sfn", label: "Step Functions" },
];

function detectLogLevel(message: string): "error" | "warn" | "info" | "debug" | null {
  const prefix = message.slice(0, 100).toUpperCase();
  if (prefix.includes("ERROR") || prefix.includes("FATAL") || prefix.includes("CRITICAL"))
    return "error";
  if (prefix.includes("WARN")) return "warn";
  if (prefix.includes("INFO")) return "info";
  if (prefix.includes("DEBUG") || prefix.includes("TRACE")) return "debug";
  return null;
}

const levelStyles: Record<string, string> = {
  error: "text-red-400",
  warn: "text-amber-400",
  info: "text-emerald-400",
  debug: "text-zinc-500",
};

function LogLine({ event }: { event: LogEventResponse }) {
  const level = detectLogLevel(event.message);
  const messageClass = level ? levelStyles[level] : "text-zinc-300";
  const ts = format(new Date(event.timestamp), "HH:mm:ss.SSS");

  return (
    <div className="group flex gap-3 px-4 py-0.5 hover:bg-white/[0.03] transition-colors">
      <span className="shrink-0 select-none text-zinc-600 tabular-nums">
        {ts}
      </span>
      <span className={`min-w-0 whitespace-pre-wrap break-all ${messageClass}`}>
        {event.message}
      </span>
    </div>
  );
}

export default function LogViewerPage() {
  const params = useParams<{ pipelineId: string }>();
  const searchParams = useSearchParams();
  const pipelineId = decodeURIComponent(params.pipelineId);

  // Time range from query params or default to last 24 hours
  const qStart = searchParams.get("startTime");
  const qEnd = searchParams.get("endTime");

  const [defaultStart] = useState(
    () => new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  );
  const [defaultEnd] = useState(() => new Date().toISOString());

  const startTime = qStart || defaultStart;
  const endTime = qEnd || defaultEnd;

  const [logSource, setLogSource] = useState<LogSource>("ecs");
  const [filterInput, setFilterInput] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | undefined>(
    undefined
  );

  // Pagination accumulation
  const [accumulated, setAccumulated] = useState<LogEventResponse[]>([]);
  const [currentToken, setCurrentToken] = useState<string | undefined>(
    undefined
  );

  const { data, isLoading, error, mutate } = useLogs({
    pipelineId,
    logSource,
    startTime,
    endTime,
    filter: activeFilter,
    nextToken: currentToken,
  });

  // Merge pages
  const events = useMemo(
    () =>
      currentToken && accumulated.length > 0
        ? [...accumulated, ...(data?.events ?? [])]
        : (data?.events ?? []),
    [currentToken, accumulated, data?.events]
  );

  const handleLoadMore = useCallback(() => {
    if (data?.nextToken) {
      setAccumulated(events);
      setCurrentToken(data.nextToken);
    }
  }, [data, events]);

  const handleSearch = useCallback(() => {
    setAccumulated([]);
    setCurrentToken(undefined);
    setActiveFilter(filterInput || undefined);
  }, [filterInput]);

  const handleSourceChange = useCallback(
    (source: LogSource) => {
      setLogSource(source);
      setAccumulated([]);
      setCurrentToken(undefined);
    },
    []
  );

  const handleRefresh = useCallback(() => {
    setAccumulated([]);
    setCurrentToken(undefined);
    mutate();
  }, [mutate]);

  // Scroll container ref for auto-scroll on new data
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevEventCount = useRef(0);
  useEffect(() => {
    if (events.length > prevEventCount.current && scrollRef.current) {
      // Only auto-scroll if user was already near the bottom
      const el = scrollRef.current;
      const isNearBottom =
        el.scrollHeight - el.scrollTop - el.clientHeight < 100;
      if (isNearBottom) {
        el.scrollTop = el.scrollHeight;
      }
    }
    prevEventCount.current = events.length;
  }, [events.length]);

  const timeRangeLabel = qStart
    ? `${format(new Date(startTime), "MMM d, HH:mm:ss")} — ${format(new Date(endTime), "MMM d, HH:mm:ss")}`
    : "Last 24 hours";

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Logs</h1>
          <p className="text-muted-foreground text-sm">{pipelineId}</p>
        </div>
        <Link
          href={`/pipelines/${encodeURIComponent(pipelineId)}`}
          className="text-sm text-blue-600 hover:underline"
        >
          Back to pipeline
        </Link>
      </div>

      {/* Controls row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1">
          {LOG_SOURCES.map((s) => (
            <Button
              key={s.value}
              variant={logSource === s.value ? "default" : "outline"}
              size="sm"
              onClick={() => handleSourceChange(s.value)}
            >
              {s.label}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filterInput}
              onChange={(e) => setFilterInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
              placeholder="Filter pattern..."
              className="h-9 w-64 pl-9"
            />
          </div>
          <Button variant="outline" size="sm" onClick={handleSearch}>
            Search
          </Button>
        </div>
      </div>

      {/* Time range */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Badge variant="secondary" className="font-mono text-xs">
          {timeRangeLabel}
        </Badge>
        {activeFilter && (
          <Badge variant="outline" className="font-mono text-xs">
            filter: {activeFilter}
          </Badge>
        )}
      </div>

      {/* Log output */}
      {error ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-red-200 bg-red-50 p-8 text-center">
          <AlertCircle className="size-8 text-red-500" />
          <div>
            <p className="font-medium text-red-800">Failed to load logs</p>
            <p className="text-sm text-red-600">
              {error.message || "An unexpected error occurred."}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => mutate()}>
            <RefreshCw className="size-4" />
            Retry
          </Button>
        </div>
      ) : (
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between border-b bg-zinc-950/[0.02] dark:bg-zinc-950/50">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Terminal className="size-4 text-muted-foreground" />
              Log Output
              {events.length > 0 && (
                <span className="text-xs font-normal text-muted-foreground">
                  ({events.length} events)
                </span>
              )}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw
                className={`size-4 ${isLoading ? "animate-spin" : ""}`}
              />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading && accumulated.length === 0 ? (
              <LogsSkeleton />
            ) : events.length === 0 ? (
              <div className="flex flex-col items-center gap-2 p-12 text-center text-muted-foreground">
                <Terminal className="size-8 opacity-40" />
                <p className="font-medium">No log events found</p>
                <p className="text-sm">
                  {activeFilter
                    ? "Try a different filter pattern or time range."
                    : "No events in this time range."}
                </p>
              </div>
            ) : (
              <>
                <div
                  ref={scrollRef}
                  className="max-h-[600px] overflow-y-auto bg-zinc-950 font-mono text-xs leading-relaxed"
                >
                  {events.map((event, i) => (
                    <LogLine key={event.eventId ?? i} event={event} />
                  ))}
                </div>
                {data?.nextToken && (
                  <div className="flex justify-center border-t bg-zinc-950/[0.02] p-3 dark:bg-zinc-950/50">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleLoadMore}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : null}
                      Load More
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
