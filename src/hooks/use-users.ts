import useSWR from "swr";
import type { UsersListResponse } from "@/lib/types/api";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useUsers() {
  const { data, error, isLoading, mutate } =
    useSWR<UsersListResponse>("/api/users", fetcher, {
      refreshInterval: 0,
    });

  return {
    users: data?.users,
    groups: data?.groups,
    isLoading,
    error,
    mutate,
  };
}
