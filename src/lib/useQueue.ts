// lib/useQueue.ts
"use client";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { QueueState } from "@/types/queue";
export type { QueueState } from "@/types/queue";

export function useQueue(
  token: string,
  refetchInterval?: number | false | ((query: { state: { data?: QueueState } }) => number | false)
) {
  return useQuery<QueueState>({
    queryKey: ["queue", token],
    queryFn: async () => {
      const r = await fetch(`/api/queue?token=${encodeURIComponent(token)}`, {
        cache: "no-store",
      });
      if (!r.ok) throw new Error("Failed to fetch queue");
      return r.json();
    },
    enabled: !!token,
    refetchInterval: refetchInterval ?? (token ? 30 * 1000 : false),
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    retry: 3,
    retryDelay: 1000,
  });
}

// 관리자 접수 훅
export function useAdminCreateQueue() {
  return useMutation({
    mutationFn: async (data: {
      name: string;
      phone: string;
      treatmentItems: string[];
      doctor?: string;
      room?: string;
    }) => {
      const response = await fetch("/api/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create queue");
      }
      return response.json();
    },
  });
}
