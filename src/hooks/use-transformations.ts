import useSWR, { type SWRConfiguration } from "swr";
import type { TransformationJobsListResponse } from "@/lib/types/api";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useTransformations(
  options?: Pick<SWRConfiguration<TransformationJobsListResponse>, "onSuccess">
) {
  const { data, error, isLoading, isValidating, mutate } =
    useSWR<TransformationJobsListResponse>("/api/transformations", fetcher, {
      refreshInterval: 30_000,
      ...options,
    });

  return {
    jobs: data?.jobs,
    isLoading,
    isValidating,
    error,
    mutate,
  };
}
