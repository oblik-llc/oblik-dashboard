import useSWR from "swr";
import type { PipelineMetricsResponse } from "@/lib/types/api";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export type MetricsPagePeriod = "7d" | "30d";

export function useMetrics(pipelineId: string, period: MetricsPagePeriod) {
  const url = `/api/pipelines/${encodeURIComponent(pipelineId)}/metrics?period=${period}`;

  const { data, error, isLoading, mutate } =
    useSWR<PipelineMetricsResponse>(url, fetcher, {
      refreshInterval: 60_000,
    });

  return {
    data,
    isLoading,
    error,
    mutate,
  };
}
