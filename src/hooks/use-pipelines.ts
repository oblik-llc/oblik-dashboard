import useSWR from "swr";
import type { PipelinesListResponse } from "@/lib/types/api";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function usePipelines() {
  const { data, error, isLoading, mutate } =
    useSWR<PipelinesListResponse>("/api/pipelines", fetcher, {
      refreshInterval: 30_000,
    });

  return {
    pipelines: data?.pipelines,
    isLoading,
    error,
    mutate,
  };
}
