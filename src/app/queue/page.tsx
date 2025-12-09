"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, Smartphone, RefreshCw, Info, ClipboardList } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useQueue, type QueueState } from "@/lib/useQueue";

// 타입 정의
type QueueStatus = {
  label: string;
  tone: "default" | "warning" | "success";
};

type AnimationConfig = {
  initial: { opacity: number; y: number };
  animate: { opacity: number; y: number };
  exit: { opacity: number; y: number };
};

export default function QueuePage() {
  // State declarations
  const [notify, setNotify] = useState<"off" | "ready" | "sent">("off");
  const [phone, setPhone] = useState("");
  const [token, setToken] = useState<string>("");
  const [isClient, setIsClient] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  // Hooks
  const prefersReducedMotion = useReducedMotion();
  const { data: queueData, isLoading, error, refetch } = useQueue(token);

  // Effects
  useEffect(() => {
    setIsClient(true);
    const sp = new URLSearchParams(window.location.search);
    const extractedToken = sp.get("token") || "";
    setToken(extractedToken);
  }, []);

  useEffect(() => {
    if (queueData) {
      setLastUpdated(Date.now());
    }
  }, [queueData]);

  // Computed values
  const progress = useMemo((): number => {
    if (!queueData) return 0;

    const { estimatedWaitTime, eta } = queueData;
    if (estimatedWaitTime <= 0) return 0;

    const done = Math.max(estimatedWaitTime - eta, 0);
    return Math.min(Math.round((done / estimatedWaitTime) * 100), 100);
  }, [queueData]);

  const status = useMemo((): QueueStatus => {
    if (!queueData) {
      return { label: "대기 중", tone: "default" };
    }

    const { eta } = queueData;
    if (eta <= 0) {
      return { label: "곧 호출됩니다", tone: "success" };
    }
    if (eta <= 5) {
      return { label: "잠시만 기다려 주세요", tone: "warning" };
    }
    return { label: "대기 중", tone: "default" };
  }, [queueData]);

  const formattedEta = useMemo((): string => {
    if (!queueData) return "";

    const { eta } = queueData;
    if (eta <= 0) return "곧 입장";
    if (eta < 60) return `${eta}분`;

    const hours = Math.floor(eta / 60);
    const minutes = eta % 60;
    return `${hours}시간 ${minutes}분`;
  }, [queueData]);

  const fadeAnim = useMemo((): AnimationConfig => {
    if (prefersReducedMotion) {
      return {
        initial: { opacity: 1, y: 0 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 1, y: 0 },
      };
    }

    return {
      initial: { opacity: 0, y: 8 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -8 },
    };
  }, [prefersReducedMotion]);

  // Event handlers
  const handleRefresh = async (): Promise<void> => {
    setRefreshing(true);
    try {
      await refetch();
      setLastUpdated(Date.now());
    } catch (error) {
      console.error("Failed to refresh queue data:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setPhone(e.target.value.replace(/[^0-9]/g, ""));
  };

  const handleNotifyChange = (newState: "off" | "ready" | "sent"): void => {
    setNotify(newState);
  };

  // Early returns for different states
  if (!isClient) {
    return (
      <div className="flex min-h-[100dvh] w-full items-center justify-center bg-background px-4 py-6">
        <div className="text-center">
          <RefreshCw className="mx-auto mb-4 h-8 w-8 animate-spin" />
          <p>페이지를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="flex min-h-[100dvh] w-full items-center justify-center bg-background px-4 py-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-red-600">접근 오류</CardTitle>
            <CardDescription className="text-center">
              유효하지 않은 대기열 링크입니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground text-sm">접수 시 발급받은 링크를 확인해주세요.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[100dvh] w-full items-center justify-center bg-background px-4 py-6">
        <div className="text-center">
          <RefreshCw className="mx-auto mb-4 h-8 w-8 animate-spin" />
          <p>대기열 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error || !queueData) {
    return (
      <div className="flex min-h-[100dvh] w-full items-center justify-center bg-gradient-to-b from-white to-slate-50 px-4 py-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-red-600">대기열을 찾을 수 없습니다</CardTitle>
            <CardDescription className="text-center">
              대기열 정보를 불러올 수 없습니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-muted-foreground text-sm">
              대기열이 만료되었거나 잘못된 링크일 수 있습니다.
            </p>
            <Button onClick={handleRefresh} variant="outline">
              다시 시도
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Destructure queue data after all checks
  const { eta, name, age, service, room, doctor, estimatedWaitTime } = queueData;

  return (
    <div className="flex min-h-[100dvh] w-full items-start justify-center bg-background px-4 py-6 sm:px-6 sm:py-8">
      <div className="w-full max-w-md space-y-4">
        <header className="flex items-center justify-between">
          <div className="min-w-0 space-y-0.5">
            <h1
              className="truncate text-xl font-semibold tracking-tight sm:text-2xl"
              title="올바른정형외과 대기 현황"
            >
              올바른정형외과 대기 현황
            </h1>
            <p
              className="text-muted-foreground truncate text-sm"
              title="접수 후 발송된 고유 링크에서 실시간 현황을 확인하세요."
            >
              접수 후 발송된 고유 링크에서 실시간 현황을 확인하세요.
            </p>

            {lastUpdated && (
              <p className="text-muted-foreground text-xs">
                마지막 업데이트: {new Date(lastUpdated).toLocaleTimeString()}
              </p>
            )}
          </div>
          <ThemeToggle inline />
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            aria-label="새로고침"
            disabled={refreshing}
          >
            <RefreshCw className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </header>

        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ClipboardList className="h-5 w-5" /> 대기표
            </CardTitle>
            <CardDescription>아래의 정보로 안내해 드립니다</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex min-w-0 items-end justify-between">
              <div className="min-w-0">
                <div className="text-muted-foreground text-sm">이름</div>
                <div
                  className="truncate text-2xl font-bold tracking-tight sm:text-3xl"
                  title={name}
                >
                  {name}
                </div>
              </div>

              <div className="min-w-0">
                <div className="text-muted-foreground text-sm">나이</div>
                <div className="truncate text-2xl font-bold tracking-tight sm:text-3xl">
                  <span className="text-xl">(만) </span>
                  {age} 세
                </div>
              </div>
              <Badge
                className="rounded-xl px-3 py-1.5 text-base sm:text-lg"
                variant={status.tone === "success" ? "default" : undefined}
              >
                {status.label}
              </Badge>
            </div>

            <Separator />

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="min-w-0 rounded-xl bg-slate-50 p-3">
                <div className="text-muted-foreground text-xs">진료실</div>
                <div className="flex h-16 flex-col items-center justify-center sm:h-20">
                  <div
                    className="truncate text-[clamp(1.75rem,7vw,2.25rem)] leading-none font-extrabold tracking-tight"
                    aria-live="polite"
                    title={room || "—"}
                  >
                    {room || "—"}
                  </div>
                  <div
                    className="text-muted-foreground mt-1 truncate text-xs sm:text-sm"
                    title={doctor || "—"}
                  >
                    {doctor || "—"}
                  </div>
                </div>
              </div>

              <div className="min-w-0 rounded-xl bg-slate-50 p-3">
                <div className="text-muted-foreground text-xs">예상 대기</div>
                <div className="flex h-16 items-center justify-center sm:h-20">
                  <div
                    className="truncate text-[clamp(1.125rem,4.5vw,1.75rem)] font-semibold"
                    title={formattedEta}
                  >
                    {formattedEta}
                  </div>
                </div>
              </div>

              <div className="min-w-0 rounded-xl bg-slate-50 p-3">
                <div className="text-muted-foreground text-xs">진료 항목</div>
                <div className="flex h-16 items-center justify-center sm:h-20">
                  <div
                    className="truncate text-[clamp(1.125rem,4.5vw,1.75rem)] font-semibold"
                    title={service}
                  >
                    {service}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">진행률</span>
                <span className="font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            <AnimatePresence initial={false}>
              {eta > 0 && eta <= 5 && (
                <motion.div {...fadeAnim}>
                  <Alert>
                    <Bell className="h-4 w-4" />
                    <AlertTitle>곧 호출 예정</AlertTitle>
                    <AlertDescription>
                      잠시 자리를 비우셨다면 안내데스크에 미리 알려주세요.
                    </AlertDescription>
                  </Alert>
                </motion.div>
              )}
            </AnimatePresence>

            <Tabs defaultValue="info" className="w-full">
              <TabsList className="grid w-full grid-cols-2 rounded-xl">
                <TabsTrigger value="info">안내</TabsTrigger>
                <TabsTrigger value="notice">알림 설정</TabsTrigger>
              </TabsList>
              <TabsContent value="info" className="space-y-3 pt-3">
                <div className="text-muted-foreground flex items-start gap-2 text-sm">
                  <Info className="mt-0.5 h-4 w-4" />
                  <ul className="list-disc space-y-1 pl-4">
                    <li>예상 대기시간은 진료 상황에 따라 달라질 수 있습니다.</li>
                    <li>호출 시 부재 중이면 순번이 뒤로 밀릴 수 있습니다.</li>
                    <li>문의: 안내데스크 (내선 0)</li>
                  </ul>
                </div>
              </TabsContent>
              <TabsContent value="notice" className="space-y-3 pt-3">
                {notify === "off" && (
                  <div className="space-y-3">
                    <div className="text-muted-foreground text-sm">
                      문자 알림을 원하시면 연락처를 확인해 주세요.
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        inputMode="tel"
                        placeholder="휴대폰 번호 (숫자만)"
                        value={phone}
                        onChange={handlePhoneChange}
                        className="rounded-xl"
                        aria-label="휴대폰 번호"
                      />
                      <Button className="rounded-xl" onClick={() => handleNotifyChange("ready")}>
                        확인
                      </Button>
                    </div>
                  </div>
                )}

                {notify === "ready" && (
                  <div className="space-y-3">
                    <div className="text-sm">입력된 번호로 진료 전 안내를 보내드릴까요?</div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        className="rounded-xl"
                        onClick={() => handleNotifyChange("off")}
                      >
                        수정
                      </Button>
                      <Button className="rounded-xl" onClick={() => handleNotifyChange("sent")}>
                        알림 받기
                      </Button>
                    </div>
                  </div>
                )}

                {notify === "sent" && (
                  <Alert>
                    <Smartphone className="h-4 w-4" />
                    <AlertTitle>알림이 설정되었습니다</AlertTitle>
                    <AlertDescription>
                      호출 1~2팀 전에 문자로 알려드립니다. {phone ? `(${phone})` : "등록된 번호"}
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <footer className="text-muted-foreground pt-2 text-center text-xs">
          © {new Date().getFullYear()} 올바른정형외과 · 대기열 시스템
        </footer>
      </div>
    </div>
  );
}
