// lib/useQueue.ts
"use client";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import type { QueueState } from "@/types/queue";
export type { QueueState } from "@/types/queue";

export function useQueue(token: string) {
  return useQuery<QueueState>({
    queryKey: ["queue", token],
    queryFn: async () => {
      const r = await fetch(`/api/queue?token=${encodeURIComponent(token)}`, {
        cache: "no-store",
      });
      if (!r.ok) throw new Error("Failed to fetch queue");
      return r.json();
    },
    // 토큰이 있을 때만 쿼리 실행
    enabled: !!token,
    // 1분마다 폴링
    refetchInterval: token ? 60 * 1000 : false, // 1분
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    retry: 3,
    retryDelay: 1000,
  });
}

export type ServiceWaitTimesResponse = {
  updatedAt: number;
  services: { service: string; waitingCount: number; remainingTotalMinutes: number }[];
};

export function useServiceWaitTimes() {
  return useQuery<ServiceWaitTimesResponse>({
    queryKey: ["queue", "serviceWaitTimes"],
    queryFn: async () => {
      const r = await fetch("/api/queue?action=serviceWaitTimes", { cache: "no-store" });
      if (!r.ok) throw new Error("Failed to fetch service wait times");
      return r.json();
    },
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    retry: 2,
    retryDelay: 1000,
  });
}

// 새로운 대기열 등록 훅
export function useCreateQueue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      age: number;
      service: string;
      room?: string;
      doctor?: string;
    }) => {
      const response = await fetch("/api/queue", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to create queue");
      }

      return response.json();
    },
    onSuccess: (data) => {
      // 성공 시 해당 토큰의 쿼리를 무효화하여 즉시 데이터를 가져오도록 함
      queryClient.invalidateQueries({ queryKey: ["queue", data.token] });
    },
  });
}
