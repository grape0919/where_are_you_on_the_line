"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Bell, BellOff, RefreshCw } from "lucide-react";

import { getActiveDoctors, getActiveServices } from "@/lib/storage";
import type { QueueItem } from "@/types/queue";

import { StatsCards } from "@/components/admin/stats-cards";
import { RegistrationForm } from "@/components/admin/registration-form";
import { DoctorKanban } from "@/components/admin/doctor-kanban";
import { CompletedList } from "@/components/admin/completed-list";

export default function AdminDashboard() {
  const [queues, setQueues] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [serviceOptions, setServiceOptions] = useState(getActiveServices());
  const [doctorOptions, setDoctorOptions] = useState<{ value: string; label: string }[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermission>("default");
  const lastConfirmedCountRef = useRef(0);

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
        const newQueues: QueueItem[] = data.queues;
        setQueues(newQueues);

        // 신규 접수 알림
        const activeCount = newQueues.filter(
          (q) => q.status === "confirmed" || q.status === "in_progress"
        ).length;
        if (activeCount > lastConfirmedCountRef.current && lastConfirmedCountRef.current >= 0) {
          if (notificationPermission === "granted") {
            new Notification("대기열 업데이트", {
              body: `현재 대기 ${activeCount}명`,
              icon: "/favicon.ico",
            });
          }
          if (soundEnabled) {
            try {
              const audio = new Audio("/notification.mp3");
              audio.play().catch(() => {});
            } catch {
              // ignore
            }
          }
        }
        lastConfirmedCountRef.current = activeCount;
      } catch (error) {
        console.error("대기열 조회 실패:", error);
      } finally {
        setLoading(false);
        if (showRefreshing) setTimeout(() => setRefreshing(false), 500);
      }
    },
    [notificationPermission, soundEnabled]
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
      adminCancel: "취소",
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

      await fetchQueues();
    } catch (error) {
      console.error(`${labels[action]} 실패:`, error);
      alert(`${labels[action]}에 실패했습니다.`);
    }
  };

  const handleDelete = async (token: string) => {
    if (!confirm("정말로 삭제하시겠습니까?")) return;
    try {
      const response = await fetch(`/api/queue?token=${encodeURIComponent(token)}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete");
      await fetchQueues();
    } catch (error) {
      console.error("삭제 실패:", error);
      alert("삭제에 실패했습니다.");
    }
  };

  const requestNotificationPermission = async () => {
    if ("Notification" in window) {
      const perm = await Notification.requestPermission();
      setNotificationPermission(perm);
    }
  };

  useEffect(() => {
    try {
      setServiceOptions(getActiveServices());
      setDoctorOptions(getActiveDoctors());
    } catch {
      // ignore
    }
    fetchQueues();
    if ("Notification" in window) setNotificationPermission(Notification.permission);

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
      {/* 알림 설정 바 */}
      <div className="flex items-center justify-end gap-4">
        <div className="flex items-center gap-2">
          {soundEnabled ? (
            <Bell className="h-4 w-4 text-muted-foreground" />
          ) : (
            <BellOff className="h-4 w-4 text-muted-foreground" />
          )}
          <Label htmlFor="sound-toggle" className="text-sm">
            알림음
          </Label>
          <Switch id="sound-toggle" checked={soundEnabled} onCheckedChange={setSoundEnabled} />
        </div>
        {notificationPermission !== "granted" && (
          <Button variant="outline" size="sm" onClick={requestNotificationPermission}>
            <Bell className="mr-2 h-4 w-4" />
            브라우저 알림 허용
          </Button>
        )}
      </div>

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
