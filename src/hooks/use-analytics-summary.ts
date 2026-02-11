import useSWR from "swr";
import type { AnalyticsSummaryResponse, AnalyticsPeriod } from "@/lib/types/api";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useAnalyticsSummary(period: AnalyticsPeriod = "30d") {
  const { data, error, isLoading, isValidating } =
    useSWR<AnalyticsSummaryResponse>(
      `/api/analytics/summary?period=${period}`,
      fetcher,
      { refreshInterval: 300_000 } // 5 minutes
    );

  return {
    summary: data,
    isLoading,
    isValidating,
    error,
  };
}
