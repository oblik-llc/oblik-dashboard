import useSWR from "swr";
import type { PipelineAnalyticsResponse, AnalyticsPeriod } from "@/lib/types/api";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function usePipelineAnalytics(
  pipelineId: string,
  period: AnalyticsPeriod = "30d"
) {
  const { data, error, isLoading, isValidating } =
    useSWR<PipelineAnalyticsResponse>(
      `/api/pipelines/${encodeURIComponent(pipelineId)}/analytics?period=${period}`,
      fetcher,
      { refreshInterval: 300_000 } // 5 minutes
    );

  return {
    analytics: data,
    isLoading,
    isValidating,
    error,
  };
}
