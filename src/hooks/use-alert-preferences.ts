import useSWR from "swr";
import type { AlertPreferencesResponse } from "@/lib/types/api";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useAlertPreferences(pipelineId: string) {
  const { data, error, isLoading, mutate } =
    useSWR<AlertPreferencesResponse>(
      `/api/pipelines/${encodeURIComponent(pipelineId)}/alerts`,
      fetcher,
      { refreshInterval: 0 }
    );

  return {
    preferences: data,
    isLoading,
    error,
    mutate,
  };
}
