import useSWR from "swr";
import type { ExecutionsListResponse } from "@/lib/types/api";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useExecutions(
  pipelineId: string,
  statusFilter?: string,
  nextToken?: string
) {
  const params = new URLSearchParams();
  if (statusFilter) params.set("status", statusFilter);
  if (nextToken) params.set("nextToken", nextToken);

  const query = params.toString();
  const url = `/api/pipelines/${encodeURIComponent(pipelineId)}/executions${query ? `?${query}` : ""}`;

  const { data, error, isLoading, mutate } =
    useSWR<ExecutionsListResponse>(url, fetcher);

  return {
    data,
    isLoading,
    error,
    mutate,
  };
}
