import useSWR from "swr";
import type { TransformationJobDetailResponse } from "@/lib/types/api";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useTransformation(jobId: string) {
  const { data, error, isLoading, mutate } =
    useSWR<TransformationJobDetailResponse>(
      `/api/transformations/${encodeURIComponent(jobId)}`,
      fetcher,
      { refreshInterval: 15_000 }
    );

  return {
    job: data,
    isLoading,
    error,
    mutate,
  };
}
