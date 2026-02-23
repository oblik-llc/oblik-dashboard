import { useState } from "react";
import useSWR from "swr";
import type { ExecutionDetailResponse } from "@/lib/types/api";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useTransformationExecutionDetail(jobId: string, executionId: string) {
  const url = `/api/transformations/${encodeURIComponent(jobId)}/executions/${encodeURIComponent(executionId)}`;
  const [isRunning, setIsRunning] = useState(true);

  const { data, error, isLoading, mutate } =
    useSWR<ExecutionDetailResponse>(url, fetcher, {
      refreshInterval: (latestData) =>
        latestData?.status === "RUNNING" ? 5_000 : 0,
      revalidateOnFocus: isRunning,
      onSuccess: (resp) => {
        setIsRunning(resp.status === "RUNNING");
      },
    });

  return {
    execution: data,
    isLoading,
    error,
    mutate,
  };
}
