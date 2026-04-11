"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Search } from "lucide-react";
import {
  Users,
  Trash2,
  RefreshCw,
  CheckCircle,
  XCircle,
  Bell,
  BellOff,
  Clock,
  PlayCircle,
  Plus,
  Stethoscope,
  ExternalLink,
} from "lucide-react";

import { getActiveDoctors, getActiveServices, getJSON } from "@/lib/storage";
import { LS_KEYS } from "@/lib/constants";
import { formatMinutesCompact, formatTimeHM } from "@/lib/time";
import { QUEUE_STATUS_LABELS, QUEUE_STATUS_COLORS } from "@/lib/constants";
import type { QueueStatus } from "@/types/queue";
import type { PatientItem } from "@/types/domain";

type QueueItem = {
  token: string;
  name: string;
  phone: string;
  treatmentItems: string[];
  totalEstimatedMinutes: number;
  doctor?: string;
  room?: string;
  status: QueueStatus;
  estimatedWaitTime: number;
  queuePosition: number;
  patientsAhead: number;
  createdAt: number;
  updatedAt: number;
  confirmedAt?: number;
  inProgressAt?: number;
  completedAt?: number;
  cancelledAt?: number;
  cancelReason?: string;
  elapsedMinutes: number;
};

export default function AdminDashboard() {
  const [queues, setQueues] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [serviceOptions, setServiceOptions] = useState(getActiveServices());
  const [doctorOptions, setDoctorOptions] = useState<{ value: string; label: string }[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");
  const lastConfirmedCountRef = useRef(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 환자 검색
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PatientItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // 접수 폼
  const [regForm, setRegForm] = useState({
    name: "",
    phone: "",
    selectedItems: [] as string[],
    doctor: "",
  });

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
  const handleRegister = async () => {
    if (!regForm.name.trim() || !regForm.phone.trim() || regForm.selectedItems.length === 0) {
      alert("이름, 연락처, 진료항목을 모두 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: regForm.name.trim(),
          phone: regForm.phone.trim(),
          treatmentItems: regForm.selectedItems,
          doctor: regForm.doctor || undefined,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "접수 실패");
      }

      // 폼 초기화
      setRegForm({ name: "", phone: "", selectedItems: [], doctor: "" });
      await fetchQueues();
    } catch (error) {
      console.error("접수 실패:", error);
      alert(error instanceof Error ? error.message : "접수 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
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

  const deleteQueue = async (token: string) => {
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

  // 환자 검색
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 1) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const patients = getJSON<PatientItem[]>(LS_KEYS.patients) ?? [];
    const q = query.trim().toLowerCase();
    const results = patients
      .filter(
        (p) =>
          p.isActive &&
          (p.name.toLowerCase().includes(q) ||
            p.phone.includes(q) ||
            p.id.toLowerCase().includes(q))
      )
      .slice(0, 5);
    setSearchResults(results);
  };

  const selectPatient = (patient: PatientItem) => {
    setRegForm((prev) => ({
      ...prev,
      name: patient.name,
      phone: patient.phone,
    }));
    setSearchQuery("");
    setSearchResults([]);
    setIsSearching(false);
  };

  const toggleItem = (value: string) => {
    setRegForm((prev) => ({
      ...prev,
      selectedItems: prev.selectedItems.includes(value)
        ? prev.selectedItems.filter((v) => v !== value)
        : [...prev.selectedItems, value],
    }));
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
    const interval = setInterval(() => fetchQueues(), 10000);
    if ("Notification" in window) setNotificationPermission(Notification.permission);
    return () => clearInterval(interval);
  }, [fetchQueues]);

  // 상태별 분류
  const confirmedQueues = queues.filter((q) => q.status === "confirmed");
  const inProgressQueues = queues.filter((q) => q.status === "in_progress");
  const completedQueues = queues.filter((q) => q.status === "completed");
  const cancelledQueues = queues.filter((q) => q.status === "cancelled");
  const activeQueues = [...inProgressQueues, ...confirmedQueues];

  // 선택된 진료항목의 합계 소요시간
  const selectedTotalMinutes = regForm.selectedItems.reduce((sum, item) => {
    const svc = serviceOptions.find((s) => s.value === item);
    return sum + (svc?.waitTime || 10);
  }, 0);

  const maskPhone = (phone: string) => {
    if (phone.length <= 4) return phone;
    return phone.slice(0, 3) + "****" + phone.slice(-4);
  };

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
          {soundEnabled ? <Bell className="h-4 w-4 text-muted-foreground" /> : <BellOff className="h-4 w-4 text-muted-foreground" />}
          <Label htmlFor="sound-toggle" className="text-sm">알림음</Label>
          <Switch id="sound-toggle" checked={soundEnabled} onCheckedChange={setSoundEnabled} />
        </div>
        {notificationPermission !== "granted" && (
          <Button variant="outline" size="sm" onClick={requestNotificationPermission}>
            <Bell className="mr-2 h-4 w-4" />
            브라우저 알림 허용
          </Button>
        )}
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">대기 중</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {confirmedQueues.length}<span className="text-muted-foreground ml-1 text-sm">명</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">진료중</CardTitle>
            <Stethoscope className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {inProgressQueues.length}<span className="text-muted-foreground ml-1 text-sm">명</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">진료완료</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {completedQueues.length}<span className="text-muted-foreground ml-1 text-sm">명</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">취소</CardTitle>
            <XCircle className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-500">
              {cancelledQueues.length}<span className="text-muted-foreground ml-1 text-sm">건</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 접수 폼 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            환자 접수
          </CardTitle>
          <CardDescription>환자 정보를 입력하고 접수하세요. 접수 시 환자에게 알림이 발송됩니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* 기존 환자 검색 */}
            <div className="relative space-y-2">
              <Label>기존 환자 검색</Label>
              <Input
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="이름, 전화번호, 환자번호로 검색"
              />
              {isSearching && searchResults.length > 0 && (
                <div className="absolute top-full left-0 z-10 mt-1 w-full rounded-md border bg-popover shadow-md">
                  {searchResults.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-accent"
                      onClick={() => selectPatient(p)}
                    >
                      <span className="font-medium">{p.name}</span>
                      <span className="text-muted-foreground">{p.phone}</span>
                    </button>
                  ))}
                </div>
              )}
              {isSearching && searchResults.length === 0 && searchQuery.trim().length >= 1 && (
                <p className="text-muted-foreground text-xs">검색 결과가 없습니다. 아래에 직접 입력해주세요.</p>
              )}
            </div>

            <Separator />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>환자명 *</Label>
                <Input
                  value={regForm.name}
                  onChange={(e) => setRegForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="홍길동"
                />
              </div>
              <div className="space-y-2">
                <Label>연락처 *</Label>
                <Input
                  inputMode="tel"
                  value={regForm.phone}
                  onChange={(e) =>
                    setRegForm((p) => ({ ...p, phone: e.target.value.replace(/[^0-9]/g, "") }))
                  }
                  placeholder="01012345678"
                />
              </div>
              <div className="space-y-2">
                <Label>담당의</Label>
                <Select
                  value={regForm.doctor}
                  onValueChange={(v) => setRegForm((p) => ({ ...p, doctor: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {doctorOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>진료항목 * (복수 선택 가능)</Label>
              <div className="flex flex-wrap gap-2">
                {serviceOptions.map((svc) => {
                  const isSelected = regForm.selectedItems.includes(svc.value);
                  return (
                    <Button
                      key={svc.value}
                      type="button"
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleItem(svc.value)}
                      className={isSelected ? "" : ""}
                    >
                      {svc.label} ({svc.waitTime}분)
                    </Button>
                  );
                })}
              </div>
              {regForm.selectedItems.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  예상 소요시간: <span className="font-medium text-foreground">{selectedTotalMinutes}분</span>
                </p>
              )}
            </div>

            <Separator />

            <Button
              onClick={handleRegister}
              disabled={isSubmitting || !regForm.name.trim() || !regForm.phone.trim() || regForm.selectedItems.length === 0}
              className="w-full md:w-auto"
            >
              <Plus className="mr-2 h-4 w-4" />
              {isSubmitting ? "접수 중..." : "접수"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 대기열 현황 — 담당의별 칸반 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">
            대기열 현황
            {activeQueues.length > 0 && (
              <Badge className="ml-2 bg-primary/10 text-primary">{activeQueues.length}</Badge>
            )}
          </h2>
          <p className="text-muted-foreground text-sm">담당의별 환자 현황</p>
        </div>
        <Button onClick={() => fetchQueues(true)} variant="outline" disabled={refreshing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "새로고침 중..." : "새로고침"}
        </Button>
      </div>

      {activeQueues.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Users className="text-muted-foreground mx-auto mb-3 h-10 w-10" />
            <p className="text-muted-foreground">현재 대기 중인 환자가 없습니다.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {(() => {
            // 담당의별 그룹핑
            const grouped = new Map<string, QueueItem[]>();
            for (const q of activeQueues) {
              const key = q.doctor || "미지정";
              const list = grouped.get(key) ?? [];
              list.push(q);
              grouped.set(key, list);
            }

            return Array.from(grouped.entries()).map(([doctorName, doctorQueues]) => {
              const hasInProgress = doctorQueues.some((q) => q.status === "in_progress");
              return (
                <Card key={doctorName} className="flex flex-col">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Stethoscope className="h-4 w-4" />
                        {doctorName}
                      </CardTitle>
                      <Badge variant="secondary">{doctorQueues.length}명</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 space-y-2">
                    {doctorQueues
                      .sort((a, b) => a.queuePosition - b.queuePosition)
                      .map((queue) => (
                        <div
                          key={queue.token}
                          className={`rounded-lg border p-3 ${
                            queue.status === "in_progress"
                              ? "border-orange-300 bg-orange-50"
                              : ""
                          }`}
                        >
                          <div className="mb-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                                {queue.queuePosition}
                              </span>
                              <span className="font-medium">{queue.name}</span>
                              <Badge className={`text-xs ${QUEUE_STATUS_COLORS[queue.status]}`}>
                                {QUEUE_STATUS_LABELS[queue.status]}
                              </Badge>
                            </div>
                          </div>
                          <div className="mb-2 flex flex-wrap gap-1">
                            {queue.treatmentItems.map((item) => (
                              <Badge key={item} variant="secondary" className="text-xs">
                                {item}
                              </Badge>
                            ))}
                          </div>
                          <div className="text-muted-foreground mb-2 text-xs">
                            {maskPhone(queue.phone)} · 소요 {queue.totalEstimatedMinutes}분
                            {queue.status === "confirmed" && queue.estimatedWaitTime > 0 && (
                              <> · 대기 {formatMinutesCompact(queue.estimatedWaitTime)}</>
                            )}
                          </div>
                          <div className="flex gap-1">
                            {queue.status === "confirmed" && (
                              <Button
                                size="sm"
                                className="h-7 bg-orange-500 px-2 text-xs hover:bg-orange-600"
                                disabled={hasInProgress}
                                onClick={() => handleStatusAction("startTreatment", queue.token)}
                              >
                                <PlayCircle className="mr-1 h-3 w-3" />
                                진료시작
                              </Button>
                            )}
                            {queue.status === "in_progress" && (
                              <Button
                                size="sm"
                                className="h-7 bg-green-600 px-2 text-xs hover:bg-green-700"
                                onClick={() => {
                                  if (confirm("진료를 완료 처리하시겠습니까?")) {
                                    handleStatusAction("complete", queue.token);
                                  }
                                }}
                              >
                                <CheckCircle className="mr-1 h-3 w-3" />
                                진료완료
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2"
                              onClick={() =>
                                window.open(
                                  `/queue?token=${encodeURIComponent(queue.token)}`,
                                  "_blank"
                                )
                              }
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2"
                              onClick={() => {
                                if (confirm("이 접수를 취소하시겠습니까?")) {
                                  handleStatusAction("adminCancel", queue.token);
                                }
                              }}
                            >
                              <XCircle className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                  </CardContent>
                </Card>
              );
            });
          })()}
        </div>
      )}

      {/* 완료/취소 */}
      {(completedQueues.length > 0 || cancelledQueues.length > 0) && (
        <details className="group">
          <summary className="cursor-pointer list-none">
            <Card>
              <CardHeader className="py-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    완료 / 취소
                    <Badge variant="secondary" className="ml-2">
                      {completedQueues.length + cancelledQueues.length}
                    </Badge>
                  </CardTitle>
                  <span className="text-muted-foreground text-sm group-open:hidden">펼치기 ▼</span>
                  <span className="text-muted-foreground hidden text-sm group-open:inline">접기 ▲</span>
                </div>
              </CardHeader>
            </Card>
          </summary>
          <div className="mt-2 space-y-3">
            {[...completedQueues, ...cancelledQueues].map((queue) => (
              <div key={queue.token} className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <span className="font-medium">{queue.name}</span>
                      <Badge className={QUEUE_STATUS_COLORS[queue.status]}>
                        {QUEUE_STATUS_LABELS[queue.status]}
                      </Badge>
                      {queue.treatmentItems.map((item) => (
                        <Badge key={item} variant="secondary" className="text-xs">{item}</Badge>
                      ))}
                    </div>
                    <div className="text-muted-foreground text-sm">
                      접수: {formatTimeHM(queue.createdAt)}
                      {queue.completedAt && <> · 완료: {formatTimeHM(queue.completedAt)}</>}
                      {queue.cancelReason && <> · 사유: {queue.cancelReason}</>}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => deleteQueue(queue.token)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
