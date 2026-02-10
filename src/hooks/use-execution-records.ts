import useSWR from "swr";
import type { ExecutionRecordsResponse } from "@/lib/types/api";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useExecutionRecords(pipelineId: string, limit = 50) {
  const url = `/api/pipelines/${encodeURIComponent(pipelineId)}/execution-records?limit=${limit}`;

  const { data, error, isLoading, mutate } =
    useSWR<ExecutionRecordsResponse>(url, fetcher, {
      refreshInterval: 60_000,
    });

  return {
    data,
    isLoading,
    error,
    mutate,
  };
}
