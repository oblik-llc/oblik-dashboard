import useSWR from "swr";
import type { LogsResponse } from "@/lib/types/api";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export type LogSource = "ecs" | "sfn";

export interface UseLogsOptions {
  pipelineId: string;
  logSource: LogSource;
  startTime: string | null;
  endTime: string | null;
  filter?: string;
  nextToken?: string;
}

export function useLogs({
  pipelineId,
  logSource,
  startTime,
  endTime,
  filter,
  nextToken,
}: UseLogsOptions) {
  const params = new URLSearchParams();
  params.set("logGroup", logSource);
  if (startTime) params.set("startTime", startTime);
  if (endTime) params.set("endTime", endTime);
  if (filter) params.set("filter", filter);
  if (nextToken) params.set("nextToken", nextToken);

  const url = `/api/pipelines/${encodeURIComponent(pipelineId)}/logs?${params.toString()}`;

  const { data, error, isLoading, mutate } = useSWR<LogsResponse>(
    startTime && endTime ? url : null,
    fetcher,
    {
      refreshInterval: 0,
      revalidateOnFocus: false,
    }
  );

  return {
    data,
    isLoading,
    error,
    mutate,
  };
}
