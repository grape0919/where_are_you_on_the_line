"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Bell, RefreshCw, ClipboardList, XCircle, CheckCircle, Stethoscope, Users } from "lucide-react";
import { useQueue } from "@/lib/useQueue";

type StatusDisplay = {
  label: string;
  tone: "default" | "warning" | "success";
};

export default function QueuePage() {
  const [token, setToken] = useState<string>("");
  const [isClient, setIsClient] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  // 상태별 동적 폴링
  const dynamicPolling = (query: { state: { data?: { status?: string } } }): number | false => {
    const status = query.state.data?.status;
    if (status === "confirmed") return 30_000;
    if (status === "in_progress") return 60_000;
    return false; // completed/cancelled
  };

  const { data: queueData, isLoading, error, refetch } = useQueue(token, dynamicPolling);

  useEffect(() => {
    setIsClient(true);
    const sp = new URLSearchParams(window.location.search);
    setToken(sp.get("token") || "");
  }, []);

  useEffect(() => {
    if (queueData) setLastUpdated(Date.now());
  }, [queueData]);

  const formatMinutes = (minutes: number): string => {
    if (minutes <= 0) return "0분";
    if (minutes < 60) return `${minutes}분`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins === 0 ? `${hours}시간` : `${hours}시간 ${mins}분`;
  };

  const statusDisplay = useMemo((): StatusDisplay => {
    if (!queueData) return { label: "대기 중", tone: "default" };
    switch (queueData.status) {
      case "confirmed": {
        if (queueData.patientsAhead === 0) return { label: "다음 순서입니다", tone: "warning" };
        if (queueData.eta <= 5) return { label: "곧 순서입니다", tone: "warning" };
        return { label: "대기 중", tone: "default" };
      }
      case "in_progress":
        return { label: "진료중", tone: "success" };
      case "completed":
        return { label: "진료완료", tone: "success" };
      case "cancelled":
        return { label: "취소됨", tone: "default" };
      default:
        return { label: "대기 중", tone: "default" };
    }
  }, [queueData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
      setLastUpdated(Date.now());
    } finally {
      setRefreshing(false);
    }
  };

  // Early returns
  if (!isClient) {
    return (
      <div className="bg-background flex min-h-[100dvh] w-full items-center justify-center px-4 py-6">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!token) {
    return (
      <div className="bg-background flex min-h-[100dvh] w-full items-center justify-center px-4 py-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-red-600">접근 오류</CardTitle>
            <CardDescription className="text-center">유효하지 않은 링크입니다.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-background flex min-h-[100dvh] w-full items-center justify-center px-4 py-6">
        <div className="text-center">
          <RefreshCw className="mx-auto mb-4 h-8 w-8 animate-spin" />
          <p>대기열 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error || !queueData) {
    return (
      <div className="bg-background flex min-h-[100dvh] w-full items-center justify-center px-4 py-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-red-600">대기열을 찾을 수 없습니다</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4 text-sm">링크가 만료되었거나 잘못된 링크입니다.</p>
            <Button onClick={handleRefresh} variant="outline">다시 시도</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { name, treatmentItems, doctor, status } = queueData;

  return (
    <div className="bg-background flex min-h-[100dvh] w-full items-start justify-center px-4 py-6 sm:px-6 sm:py-8">
      <div className="w-full max-w-md space-y-4">
        {/* 헤더 */}
        <header className="flex items-center justify-between">
          <div className="min-w-0 space-y-0.5">
            <Image src="/logo.png" alt="올바른정형외과" width={160} height={22} className="mb-1" />
            <h1 className="text-xl font-semibold tracking-tight">대기 현황</h1>
            {lastUpdated && (
              <p className="text-muted-foreground text-xs">
                업데이트: {new Date(lastUpdated).toLocaleTimeString()}
              </p>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </header>

        {/* confirmed: 대기 중 */}
        {status === "confirmed" && (
          <>
            <Card className="rounded-2xl shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ClipboardList className="h-5 w-5" /> 대기표
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-muted-foreground text-sm">이름</div>
                    <div className="text-2xl font-bold">{name}</div>
                  </div>
                  <Badge
                    className="rounded-xl px-3 py-1.5 text-base"
                    variant={statusDisplay.tone === "warning" ? "default" : "secondary"}
                  >
                    {statusDisplay.label}
                  </Badge>
                </div>

                <Separator />

                {/* 핵심 정보 3가지 */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-xl bg-primary/5 p-4">
                    <div className="text-muted-foreground text-xs">내 순서</div>
                    <div className="mt-1 text-3xl font-extrabold text-primary">
                      {queueData.queuePosition}
                    </div>
                    <div className="text-muted-foreground text-xs">번째</div>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="text-muted-foreground text-xs">앞에</div>
                    <div className="mt-1 text-3xl font-extrabold">
                      {queueData.patientsAhead}
                    </div>
                    <div className="text-muted-foreground text-xs">명 대기</div>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="text-muted-foreground text-xs">예상 대기</div>
                    <div className="mt-1 text-2xl font-bold">
                      {formatMinutes(queueData.eta)}
                    </div>
                  </div>
                </div>

                {/* 임박 알림 */}
                {queueData.patientsAhead <= 1 && queueData.patientsAhead > 0 && (
                  <Alert>
                    <Bell className="h-4 w-4" />
                    <AlertTitle>곧 순서입니다</AlertTitle>
                    <AlertDescription>잠시 후 호출됩니다. 진료실 근처에서 대기해주세요.</AlertDescription>
                  </Alert>
                )}
                {queueData.patientsAhead === 0 && (
                  <Alert className="border-primary bg-primary/5">
                    <Bell className="h-4 w-4 text-primary" />
                    <AlertTitle className="text-primary">다음 순서입니다</AlertTitle>
                    <AlertDescription>진료실로 이동해주세요.</AlertDescription>
                  </Alert>
                )}

                <Separator />

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">진료항목</span>
                    <div className="flex gap-1">
                      {treatmentItems.map((item) => (
                        <Badge key={item} variant="secondary" className="text-xs">{item}</Badge>
                      ))}
                    </div>
                  </div>
                  {doctor && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">담당의</span>
                      <span className="font-medium">{doctor}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl shadow-sm">
              <CardContent className="pt-6">
                <div className="text-muted-foreground flex items-start gap-2 text-sm">
                  <Users className="mt-0.5 h-4 w-4 shrink-0" />
                  <ul className="list-disc space-y-1 pl-4">
                    <li>예상 대기시간은 진료 상황에 따라 달라질 수 있습니다.</li>
                    <li>호출 시 부재 중이면 순번이 뒤로 밀릴 수 있습니다.</li>
                    <li>문의: 안내데스크</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* in_progress: 진료중 */}
        {status === "in_progress" && (
          <Card className="rounded-2xl shadow-sm">
            <CardContent className="py-12">
              <div className="flex flex-col items-center justify-center text-center">
                <Stethoscope className="mb-4 h-14 w-14 text-orange-500" />
                <p className="text-xl font-bold">진료가 진행 중입니다</p>
                <p className="text-muted-foreground mt-2 text-sm">{name}님</p>
                <div className="mt-4 flex gap-1">
                  {treatmentItems.map((item) => (
                    <Badge key={item} variant="secondary">{item}</Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* completed: 진료완료 */}
        {status === "completed" && (
          <Card className="rounded-2xl shadow-sm">
            <CardContent className="py-12">
              <div className="flex flex-col items-center justify-center text-center">
                <CheckCircle className="mb-4 h-14 w-14 text-green-500" />
                <p className="text-xl font-bold">진료가 완료되었습니다</p>
                <p className="text-muted-foreground mt-2 text-sm">이용해 주셔서 감사합니다</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* cancelled */}
        {status === "cancelled" && (
          <Card className="rounded-2xl shadow-sm">
            <CardContent className="py-12">
              <div className="flex flex-col items-center justify-center text-center">
                <XCircle className="mb-4 h-14 w-14 text-gray-400" />
                <p className="text-xl font-bold">접수가 취소되었습니다</p>
                {queueData.cancelReason && (
                  <p className="text-muted-foreground mt-2 text-sm">사유: {queueData.cancelReason}</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <footer className="text-muted-foreground pt-4 text-center text-[10px]">
          <a
            href="https://redbridgedev.ai.kr"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground/60 transition-colors"
          >
            developed by Red Bridge Dev
          </a>
        </footer>
      </div>
    </div>
  );
}
