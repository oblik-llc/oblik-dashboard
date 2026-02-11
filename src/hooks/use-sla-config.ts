import useSWR from "swr";
import type { SlaConfigResponse } from "@/lib/types/api";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useSlaConfig(pipelineId: string) {
  const { data, error, isLoading, mutate } = useSWR<SlaConfigResponse>(
    `/api/pipelines/${encodeURIComponent(pipelineId)}/sla`,
    fetcher,
    { refreshInterval: 0 }
  );

  return {
    config: data,
    isLoading,
    error,
    mutate,
  };
}
