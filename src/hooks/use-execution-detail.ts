import useSWR from "swr";
import type { ExecutionDetailResponse } from "@/lib/types/api";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useExecutionDetail(pipelineId: string, executionId: string) {
  const url = `/api/pipelines/${encodeURIComponent(pipelineId)}/executions/${encodeURIComponent(executionId)}`;

  const { data, error, isLoading, mutate } =
    useSWR<ExecutionDetailResponse>(url, fetcher, {
      refreshInterval: (latestData) =>
        latestData?.status === "RUNNING" ? 5_000 : 0,
    });

  return {
    execution: data,
    isLoading,
    error,
    mutate,
  };
}
