import useSWR from "swr";
import type { AlertHistoryResponse } from "@/lib/types/api";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useAlertHistory(pipelineId: string) {
  const { data, error, isLoading, mutate } =
    useSWR<AlertHistoryResponse>(
      `/api/pipelines/${encodeURIComponent(pipelineId)}/alerts/history`,
      fetcher,
      { refreshInterval: 30_000 }
    );

  return {
    history: data,
    isLoading,
    error,
    mutate,
  };
}
