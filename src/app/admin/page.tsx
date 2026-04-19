"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw } from "lucide-react";

import type { QueueItem } from "@/types/queue";
import { toast } from "sonner";

import { StatsCards } from "@/components/admin/stats-cards";
import { RegistrationForm } from "@/components/admin/registration-form";
import { DoctorKanban } from "@/components/admin/doctor-kanban";
import { CompletedList } from "@/components/admin/completed-list";
import { useServices, useDoctors } from "@/lib/useMasterData";
import { useConfirm } from "@/components/confirm-dialog";

export default function AdminDashboard() {
  const confirm = useConfirm();
  const [queues, setQueues] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 진료항목 + 의사 마스터 데이터 (DB 기반)
  const { data: servicesRaw = [] } = useServices(true);
  const { data: doctorsRaw = [] } = useDoctors(true);

  const serviceOptions = servicesRaw.map((s) => ({
    value: s.value,
    label: s.label,
    waitTime: s.waitTime,
  }));
  const doctorOptions = doctorsRaw.map((d) => ({
    value: d.name,
    label: `${d.name} (${d.specialty} - ${d.room}호)`,
  }));

  const fetchQueues = useCallback(
    async (showRefreshing = false) => {
      if (showRefreshing) setRefreshing(true);

      try {
        const response = await fetch("/api/queue?action=list", { method: "PATCH" });
        if (response.status === 401) {
          window.location.assign("/admin/login?next=/admin");
          return;
        }
        if (!response.ok) throw new Error("Failed to fetch queues");

        const data = await response.json();
        setQueues(data.queues);
      } catch (error) {
        console.error("대기열 조회 실패:", error);
      } finally {
        setLoading(false);
        if (showRefreshing) setTimeout(() => setRefreshing(false), 500);
      }
    },
    []
  );

  // 접수 처리
  const handleRegister = async (data: {
    name: string;
    phone: string;
    selectedItems: string[];
    totalEstimatedMinutes: number;
    doctor?: string;
  }) => {
    const response = await fetch("/api/queue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.name,
        phone: data.phone,
        treatmentItems: data.selectedItems,
        totalEstimatedMinutes: data.totalEstimatedMinutes,
        doctor: data.doctor,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || "접수 실패");
    }

    toast.success(`${data.name}님 접수 완료`);
    await fetchQueues();
  };

  // 상태 전이
  const handleStatusAction = async (
    action: "startTreatment" | "complete" | "adminCancel",
    token: string,
    cancelReason?: string
  ) => {
    const labels: Record<string, string> = {
      startTreatment: "진료 시작",
      complete: "진료 완료",
      adminCancel: "접수 취소",
    };

    try {
      const response = await fetch(`/api/queue?action=${action}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, cancelReason }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `${labels[action]} 실패`);
      }

      toast.success(`${labels[action]} 처리됨`);
      await fetchQueues();
    } catch (error) {
      console.error(`${labels[action]} 실패:`, error);
      toast.error(error instanceof Error ? error.message : `${labels[action]}에 실패했습니다.`);
    }
  };

  const handleDelete = async (token: string) => {
    const ok = await confirm({
      title: "접수 영구 삭제",
      description: "선택한 접수를 영구 삭제합니다. 이 작업은 되돌릴 수 없습니다.",
      confirmText: "삭제",
      destructive: true,
    });
    if (!ok) return;
    try {
      const response = await fetch(`/api/queue?token=${encodeURIComponent(token)}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete");
      toast.success("삭제되었습니다");
      await fetchQueues();
    } catch (error) {
      console.error("삭제 실패:", error);
      toast.error("삭제에 실패했습니다.");
    }
  };

  useEffect(() => {
    fetchQueues();

    // 탭 활성 시에만 폴링
    let interval = setInterval(() => fetchQueues(), 10000);

    const handleVisibility = () => {
      if (document.hidden) {
        clearInterval(interval);
      } else {
        fetchQueues();
        interval = setInterval(() => fetchQueues(), 10000);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [fetchQueues]);

  // 상태별 분류
  const confirmedQueues = queues.filter((q) => q.status === "confirmed");
  const inProgressQueues = queues.filter((q) => q.status === "in_progress");
  const completedQueues = queues.filter((q) => q.status === "completed");
  const cancelledQueues = queues.filter((q) => q.status === "cancelled");
  const activeQueues = [...inProgressQueues, ...confirmedQueues];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <RefreshCw className="mx-auto mb-4 h-8 w-8 animate-spin" />
          <p>대기열 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <StatsCards
        confirmed={confirmedQueues.length}
        inProgress={inProgressQueues.length}
        completed={completedQueues.length}
        cancelled={cancelledQueues.length}
      />

      <RegistrationForm
        serviceOptions={serviceOptions}
        doctorOptions={doctorOptions}
        onRegister={handleRegister}
      />

      <DoctorKanban
        activeQueues={activeQueues}
        refreshing={refreshing}
        onRefresh={() => fetchQueues(true)}
        onStatusAction={handleStatusAction}
      />

      <CompletedList
        completedQueues={completedQueues}
        cancelledQueues={cancelledQueues}
        onDelete={handleDelete}
      />
    </div>
  );
}
