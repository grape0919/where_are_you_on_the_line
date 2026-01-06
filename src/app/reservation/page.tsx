"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Calendar as CalendarIcon, CheckCircle, AlertCircle, Copy, Share2 } from "lucide-react";
import {
  buildReservationMessage,
  calculateSlotUsage,
  getReservationLimits,
  getReservationsByDate,
  ReservationLimitError,
  useCreateReservation,
} from "@/lib/useReservation";
import { format, isBefore, startOfDay } from "date-fns";
import { ko } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { getReservationPrefill } from "@/lib/devDefaults";
import {
  DEFAULT_SERVICE_OPTIONS,
  PATIENT_ID_PAD_LENGTH,
  PATIENT_ID_PREFIX,
  RESERVATION_TIME_SLOTS,
} from "@/lib/constants";
import type { ReservationData } from "@/types/domain";
import { ensureDefaultPatients, getPatientsWithNormalizedIds } from "@/lib/storage";

const sanitizePhoneNumber = (value: string) => value.replace(/\D/g, "");
const extractPatientDigits = (value: string) => value.replace(/\D/g, "");
const buildPatientId = (digits: string) => {
  const numeric = extractPatientDigits(digits);
  if (!numeric) return "";
  return `${PATIENT_ID_PREFIX}${numeric.padStart(PATIENT_ID_PAD_LENGTH, "0")}`;
};
const patientDigitsPlaceholder = `예: ${"1".padStart(PATIENT_ID_PAD_LENGTH, "0")}`;

// 서비스 옵션은 공통 상수를 사용합니다.

export default function ReservationPage() {
  const [serviceOptions] = useState(DEFAULT_SERVICE_OPTIONS);
  const prefill = getReservationPrefill();
  const [formData, setFormData] = useState({
    name: prefill?.name ?? "",
    patientIdDigits: prefill?.patientId ? extractPatientDigits(prefill.patientId) : "",
    phone: prefill?.phone ?? "",
    service: prefill?.service ?? "",
    date: prefill?.date ?? "",
    timeSlot: prefill?.timeSlot ?? "",
  });

  const [hasHistory, setHasHistory] = useState<boolean | null>(null);
  const [successData, setSuccessData] = useState<ReservationData | null>(null);
  const [slotUsage, setSlotUsage] = useState<Record<string, number>>({});
  const [dailyCount, setDailyCount] = useState(0);

  const createReservationMutation = useCreateReservation();
  const limits = useMemo(
    () => getReservationLimits(formData.service, formData.date),
    [formData.service, formData.date]
  );
  const refreshSlotUsage = useCallback(() => {
    if (!formData.date) {
      setSlotUsage({});
      setDailyCount(0);
      return;
    }
    const reservationsForDay = getReservationsByDate(formData.date);
    const dayRelevant =
      limits.perDayScope === "service" && formData.service
        ? reservationsForDay.filter((reservation) => reservation.service === formData.service)
        : reservationsForDay;
    const slotRelevant =
      limits.perSlotScope === "service" && formData.service
        ? reservationsForDay.filter((reservation) => reservation.service === formData.service)
        : reservationsForDay;
    setSlotUsage(calculateSlotUsage(slotRelevant));
    setDailyCount(dayRelevant.length);
  }, [formData.date, formData.service, limits.perDayScope, limits.perSlotScope]);

  useEffect(() => {
    refreshSlotUsage();
  }, [refreshSlotUsage, successData]);

  useEffect(() => {
    setHasHistory((prev) => (prev === null ? prev : null));
  }, [formData.name, formData.patientIdDigits, formData.phone]);

  // 기존 방문 이력 확인
  const checkVisitHistory = async () => {
    if (!formData.name || !formData.patientIdDigits || !formData.phone) {
      alert("이름, 환자 ID, 전화번호를 모두 입력해주세요.");
      return;
    }

    const resolvedPatientId = buildPatientId(formData.patientIdDigits);
    if (!resolvedPatientId) {
      alert("환자 ID는 숫자만 입력할 수 있습니다.");
      return;
    }

    try {
      ensureDefaultPatients();
      const patients = getPatientsWithNormalizedIds();
      const targetName = formData.name.trim();
      const targetPhone = sanitizePhoneNumber(formData.phone);
      const match = patients.find(
        (patient) =>
          patient.id === resolvedPatientId &&
          patient.name.trim() === targetName &&
          sanitizePhoneNumber(patient.phone) === targetPhone
      );

      const hasVisited = Boolean(match);
      setHasHistory(hasVisited);

      if (!hasVisited) {
        alert("기존 방문 이력이 없는 환자입니다. 예약은 기존 환자만 가능합니다.");
      }
    } catch (error) {
      console.error("방문 이력 확인 실패:", error);
      alert("방문 이력 확인 중 오류가 발생했습니다.");
    }
  };

  // 예약 등록
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.name ||
      !formData.patientIdDigits ||
      !formData.phone ||
      !formData.service ||
      !formData.date ||
      !formData.timeSlot
    ) {
      alert("모든 필드를 입력해주세요.");
      return;
    }

    const resolvedPatientId = buildPatientId(formData.patientIdDigits);
    if (!resolvedPatientId) {
      alert("환자 ID는 숫자만 입력할 수 있습니다.");
      return;
    }

    if (hasHistory === null) {
      alert("먼저 방문 이력을 확인해주세요.");
      return;
    }

    if (!hasHistory) {
      alert("기존 방문 이력이 없는 환자는 예약할 수 없습니다.");
      return;
    }

    try {
      const result = await createReservationMutation.mutateAsync({
        name: formData.name,
        patientId: resolvedPatientId,
        phone: formData.phone,
        service: formData.service,
        date: formData.date,
        timeSlot: formData.timeSlot,
      });

      setSuccessData(result);

      // 폼 초기화
      setFormData({
        name: "",
        patientIdDigits: "",
        phone: "",
        service: "",
        date: "",
        timeSlot: "",
      });
      setHasHistory(null);
    } catch (error) {
      if (error instanceof ReservationLimitError) {
        alert(error.message);
        refreshSlotUsage();
        return;
      }
      console.error("예약 실패:", error);
      alert("예약 중 오류가 발생했습니다. 다시 시도해주세요.");
      refreshSlotUsage();
    }
  };

  const handleSelectTimeSlot = (slot: string) => {
    const usage = slotUsage[slot] ?? 0;
    if (isDailyLimitReached || usage >= limits.perSlot) {
      alert("선택한 시간대는 예약이 마감되었습니다.");
      return;
    }
    setFormData((prev) => ({ ...prev, timeSlot: slot }));
  };

  const clipboardMessage = useMemo(
    () => (successData ? buildReservationMessage(successData, { channel: "clipboard" }) : null),
    [successData]
  );

  const shareMessage = useMemo(
    () => (successData ? buildReservationMessage(successData, { channel: "sms" }) : null),
    [successData]
  );

  const handleCopySummary = async () => {
    if (!clipboardMessage) return;
    try {
      await navigator.clipboard.writeText(clipboardMessage.body);
      alert("예약 정보가 복사되었습니다.");
    } catch (error) {
      console.error("예약 정보 복사 실패:", error);
      alert("복사에 실패했습니다. 다시 시도해주세요.");
    }
  };

  const handleShareSummary = async () => {
    if (!shareMessage) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareMessage.title,
          text: shareMessage.body,
        });
        return;
      } catch (error) {
        console.error("예약 정보 공유 실패:", error);
      }
    }
    try {
      await navigator.clipboard.writeText(shareMessage.body);
      alert("예약 정보가 복사되었습니다.");
    } catch (error) {
      console.error("예약 정보 공유 실패:", error);
      alert("공유가 지원되지 않아 예약 정보를 복사했습니다. 다시 시도해주세요.");
    }
  };

  const isDailyLimitReached =
    !!formData.date && limits.perDay > 0 && dailyCount >= limits.perDay;

  return (
    <div className="bg-background flex min-h-[100dvh] w-full items-start justify-center px-4 py-6 sm:px-6 sm:py-8">
      <div className="w-full max-w-md space-y-4">
        <header className="flex items-center justify-between">
          <div className="w-full text-center">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">예약 등록</h1>
            <p className="text-muted-foreground mt-2">기존 환자의 진료 예약을 등록하세요</p>
          </div>
        </header>

        {!successData ? (
          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                예약 정보 입력
              </CardTitle>
              <CardDescription>환자 정보와 진료 항목을 입력하여 예약을 등록하세요</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">이름 *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="홍길동"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="patientIdDigits">환자 ID *</Label>
                  <div className="flex">
                    <span className="border-input bg-muted text-muted-foreground flex h-9 items-center rounded-l-md border border-r-0 px-3 text-sm font-medium">
                      {PATIENT_ID_PREFIX}
                    </span>
                    <Input
                      id="patientIdDigits"
                      value={formData.patientIdDigits}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          patientIdDigits: extractPatientDigits(e.target.value),
                        }))
                      }
                      placeholder={patientDigitsPlaceholder}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className="rounded-l-none border-l-0"
                      required
                    />
                  </div>
                  <p className="text-muted-foreground text-sm">
                    P 접두사는 고정이며 숫자만 입력하세요.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">전화번호 *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                    placeholder="010-1234-5678"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date">예약 날짜 *</Label>
                  <Calendar
                    mode="single"
                    selected={formData.date ? new Date(formData.date) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        const formattedDate = format(date, "yyyy-MM-dd");
                        setFormData((prev) => ({ ...prev, date: formattedDate }));
                      }
                    }}
                    disabled={(date) => {
                      const today = startOfDay(new Date());
                      return isBefore(date, today);
                    }}
                    // Show two months only on large screens; otherwise single month
                    numberOfMonths={1}
                    locale={ko}
                    className="w-full rounded-md border"
                  />

                  {formData.date && (
                    <Alert className="mt-3">
                      <CalendarIcon className="h-4 w-4" />
                      <AlertTitle>선택된 예약 날짜</AlertTitle>
                      <AlertDescription>
                        {format(new Date(formData.date), "M월 d일 (E)", { locale: ko })}에 예약이
                        등록됩니다.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="service">진료 항목 *</Label>
                  <Select
                    value={formData.service}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, service: value }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="진료 항목을 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {serviceOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label} (예상 {option.waitTime}분)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {formData.service && (
                  <Alert>
                    <CalendarIcon className="h-4 w-4" />
                    <AlertTitle>예상 대기 시간</AlertTitle>
                    <AlertDescription>
                      {serviceOptions.find((option) => option.value === formData.service)?.label}의
                      예상 대기 시간은{" "}
                      {serviceOptions.find((option) => option.value === formData.service)?.waitTime}
                      분입니다.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label>예약 시간 *</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {RESERVATION_TIME_SLOTS.map((slot) => {
                      const selected = formData.timeSlot === slot.value;
                      const usage = slotUsage[slot.value] ?? 0;
                      const slotFull = usage >= limits.perSlot || isDailyLimitReached;
                      return (
                        <Button
                          key={slot.value}
                          type="button"
                          variant={selected ? "default" : "outline"}
                          onClick={() => handleSelectTimeSlot(slot.value)}
                          aria-pressed={selected}
                          className="h-16 flex flex-col items-center justify-center gap-1 px-2 text-sm"
                          disabled={slotFull}
                        >
                          <span className="font-medium leading-none">{slot.label}</span>
                          <span className="text-xs text-muted-foreground leading-none">
                            {usage}/{limits.perSlot}
                          </span>
                        </Button>
                      );
                    })}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    시간대 정원 {limits.perSlot}명
                    {limits.perSlotScope === "service" ? " (서비스 기준)" : " (전체 기준)"} · 일일 정원{" "}
                    {limits.perDay}명
                    {limits.perDayScope === "service" ? " (서비스 기준)" : " (전체 기준)"}
                  </p>
                  {isDailyLimitReached && (
                    <Alert>
                      <AlertCircle className="h-4 w-4 text-red-500" />
                      <AlertTitle>예약 마감</AlertTitle>
                      <AlertDescription>
                        선택한 날짜의 예약 정원이 모두 찼습니다. 다른 날짜를 선택해주세요.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                {/* 방문 이력 확인 섹션 */}
                <div className="space-y-3">
                  <Separator />
                  <div className="text-sm font-medium">방문 이력 확인</div>

                  {hasHistory === null && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>이력 확인 필요</AlertTitle>
                      <AlertDescription>
                        예약을 위해 먼저 기존 방문 이력을 확인해주세요.
                      </AlertDescription>
                    </Alert>
                  )}

                  {hasHistory === true && (
                    <Alert>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertTitle>방문 이력 확인됨</AlertTitle>
                      <AlertDescription>
                        기존 환자로 확인되었습니다. 예약을 진행할 수 있습니다.
                      </AlertDescription>
                    </Alert>
                  )}

                  {hasHistory === false && (
                    <Alert>
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <AlertTitle>방문 이력 없음</AlertTitle>
                      <AlertDescription>
                        기존 방문 이력이 없습니다. 예약은 기존 환자만 가능합니다.
                      </AlertDescription>
                    </Alert>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={checkVisitHistory}
                    disabled={!formData.name || !formData.patientIdDigits || !formData.phone}
                    className="w-full"
                  >
                    방문 이력 확인
                  </Button>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={
                    !hasHistory ||
                    hasHistory === null ||
                    !formData.timeSlot ||
                    createReservationMutation.isPending ||
                    isDailyLimitReached
                  }
                >
                  {createReservationMutation.isPending ? "예약 중..." : "예약 등록"}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                예약 완료
              </CardTitle>
              <CardDescription>진료 예약이 성공적으로 등록되었습니다</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">환자명</span>
                  <span className="font-medium">{successData.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">진료항목</span>
                  <span className="font-medium">{successData.service}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">예약 날짜</span>
                  <span className="font-medium">{successData.date}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">예약 시간</span>
                  <span className="font-medium">{successData.timeSlot}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">예상 대기시간</span>
                  <span className="font-medium">{successData.estimatedWaitTime}분</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">예약번호</span>
                  <span className="font-mono font-medium">{successData.reservationId}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={handleCopySummary}>
                  <Copy className="mr-2 h-4 w-4" />
                  예약 정보 복사
                </Button>
                <Button variant="outline" className="flex-1" onClick={handleShareSummary}>
                  <Share2 className="mr-2 h-4 w-4" />
                  예약 정보 공유
                </Button>
              </div>

              <Button onClick={() => setSuccessData(null)} className="w-full" variant="secondary">
                새로운 예약
              </Button>
            </CardContent>
          </Card>
        )}

        <footer className="text-muted-foreground pt-2 text-center text-xs">
          © {new Date().getFullYear()} 올바른정형외과 · 예약 시스템
        </footer>
      </div>
    </div>
  );
}
