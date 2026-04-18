"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, WifiOff } from "lucide-react";

type Status = "ok" | "degraded" | "offline";

interface HealthResponse {
  status: "ok" | "degraded";
  db: {
    enabled: boolean;
    reachable: boolean;
    message?: string;
  };
}

const POLL_INTERVAL_MS = 30_000;

/**
 * 백그라운드로 /api/health를 폴링하여 DB/서버 연결 상태를 모니터링.
 * 상태 저하 시 화면 상단에 고정 배너를 표시.
 */
export function SystemStatusBanner() {
  const [status, setStatus] = useState<Status>("ok");
  const [message, setMessage] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch("/api/health", { cache: "no-store" });
        const data = (await res.json()) as HealthResponse;
        if (data.status === "ok") {
          setStatus("ok");
          setMessage(null);
        } else {
          setStatus("degraded");
          setMessage(data.db.message ?? "데이터베이스 연결에 문제가 있습니다.");
        }
      } catch {
        setStatus("offline");
        setMessage("서버에 연결할 수 없습니다. 네트워크 상태를 확인해주세요.");
      }
    };

    check();
    intervalRef.current = setInterval(check, POLL_INTERVAL_MS);

    const handleVisibility = () => {
      if (document.hidden) {
        if (intervalRef.current) clearInterval(intervalRef.current);
      } else {
        check();
        intervalRef.current = setInterval(check, POLL_INTERVAL_MS);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  if (status === "ok") return null;

  const isOffline = status === "offline";
  const Icon = isOffline ? WifiOff : AlertTriangle;
  const title = isOffline
    ? "서버 연결 끊김"
    : "시스템 점검 중 — 데이터베이스 일시 장애";
  const description = isOffline
    ? "네트워크 또는 서버가 응답하지 않습니다. 잠시 후 다시 시도해주세요."
    : "신규 접수 및 상태 변경이 제한될 수 있습니다. 잠시 후 자동으로 복구됩니다.";

  return (
    <div
      role="alert"
      className="sticky top-0 z-50 w-full border-b border-red-700 bg-red-600 px-4 py-2 text-white shadow-sm"
    >
      <div className="mx-auto flex max-w-7xl items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-xs opacity-90">{description}</p>
          {message && process.env.NODE_ENV !== "production" && (
            <p className="mt-1 text-[10px] font-mono opacity-70">[dev] {message}</p>
          )}
        </div>
      </div>
    </div>
  );
}
