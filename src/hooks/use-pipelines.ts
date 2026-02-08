import useSWR, { type SWRConfiguration } from "swr";
import type { PipelinesListResponse } from "@/lib/types/api";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function usePipelines(
  options?: Pick<SWRConfiguration<PipelinesListResponse>, "onSuccess">
) {
  const { data, error, isLoading, isValidating, mutate } =
    useSWR<PipelinesListResponse>("/api/pipelines", fetcher, {
      refreshInterval: 30_000,
      ...options,
    });

  return {
    pipelines: data?.pipelines,
    isLoading,
    isValidating,
    error,
    mutate,
  };
}
