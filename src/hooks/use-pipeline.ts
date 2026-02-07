import useSWR from "swr";
import type { PipelineDetailResponse } from "@/lib/types/api";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function usePipeline(pipelineId: string) {
  const { data, error, isLoading, mutate } =
    useSWR<PipelineDetailResponse>(
      `/api/pipelines/${encodeURIComponent(pipelineId)}`,
      fetcher,
      { refreshInterval: 15_000 }
    );

  return {
    pipeline: data,
    isLoading,
    error,
    mutate,
  };
}
