"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Settings, Clock, Database, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useConfirm } from "@/components/confirm-dialog";

interface OperatingHoursRule {
  dayOfWeek: string;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
  hasLunch?: boolean;
  lunchStart?: string;
  lunchEnd?: string;
}

const DAY_LABELS: Record<string, string> = {
  MON: "월요일",
  TUE: "화요일",
  WED: "수요일",
  THU: "목요일",
  FRI: "금요일",
  SAT: "토요일",
  SUN: "일요일",
};

export default function SettingsPage() {
  const confirm = useConfirm();
  const [hours, setHours] = useState<OperatingHoursRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastResetDate, setLastResetDate] = useState<string | null>(null);

  // 설정 불러오기
  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        setHours(data.operatingHours);
        setLastResetDate(data.lastResetDate);
      })
      .catch((e) => console.error("설정 조회 실패:", e))
      .finally(() => setLoading(false));
  }, []);

  // 운영시간 변경 핸들러
  const updateRule = (dayOfWeek: string, patch: Partial<OperatingHoursRule>) => {
    setHours((prev) =>
      prev.map((rule) => (rule.dayOfWeek === dayOfWeek ? { ...rule, ...patch } : rule))
    );
  };

  // 저장
  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operatingHours: hours }),
      });
      if (!response.ok) throw new Error("저장 실패");
      toast.success("운영시간 설정 저장됨");
    } catch (error) {
      console.error("설정 저장 실패:", error);
      toast.error("설정 저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  // 대기열 수동 초기화
  const handleReset = async () => {
    const ok = await confirm({
      title: "대기열 초기화",
      description:
        "현재 접수된 모든 환자 대기열이 삭제됩니다. 이 작업은 되돌릴 수 없습니다.",
      confirmText: "초기화",
      destructive: true,
    });
    if (!ok) return;

    try {
      const response = await fetch("/api/queue?action=reset", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!response.ok) throw new Error("초기화 실패");
      const data = await response.json();
      toast.success(`대기열 ${data.cleared}건 초기화됨`);
    } catch (error) {
      console.error("초기화 실패:", error);
      toast.error("대기열 초기화에 실패했습니다.");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* 운영시간 설정 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            운영시간 설정
          </CardTitle>
          <CardDescription>
            요일별 운영시간 및 점심시간을 설정합니다. 영업종료 2시간 후 대기열이 자동 초기화됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 평일 일괄 적용 */}
          {hours.length > 0 && (
            <div className="bg-muted/30 flex flex-wrap items-center gap-2 rounded-lg border border-dashed p-3 text-sm">
              <span className="text-muted-foreground">빠른 적용:</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const monRule = hours.find((r) => r.dayOfWeek === "MON");
                  if (!monRule) return;
                  setHours((prev) =>
                    prev.map((r) =>
                      ["TUE", "WED", "THU", "FRI"].includes(r.dayOfWeek)
                        ? {
                            ...r,
                            openTime: monRule.openTime,
                            closeTime: monRule.closeTime,
                            isClosed: monRule.isClosed,
                            hasLunch: monRule.hasLunch,
                            lunchStart: monRule.lunchStart,
                            lunchEnd: monRule.lunchEnd,
                          }
                        : r
                    )
                  );
                }}
              >
                월요일 설정을 평일에 적용
              </Button>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {hours.map((rule) => (
              <div
                key={rule.dayOfWeek}
                className={`rounded-lg border p-4 transition ${
                  rule.isClosed ? "bg-muted/40" : "bg-card"
                }`}
              >
                {/* 헤더: 요일 + 휴무 토글 */}
                <div className="mb-3 flex items-center justify-between">
                  <div className="font-semibold">{DAY_LABELS[rule.dayOfWeek]}</div>
                  <div className="flex items-center gap-2">
                    <Label
                      htmlFor={`closed-${rule.dayOfWeek}`}
                      className="text-muted-foreground text-xs"
                    >
                      휴무
                    </Label>
                    <Switch
                      id={`closed-${rule.dayOfWeek}`}
                      checked={rule.isClosed}
                      onCheckedChange={(checked) =>
                        updateRule(rule.dayOfWeek, { isClosed: checked })
                      }
                    />
                  </div>
                </div>

                {rule.isClosed ? (
                  <p className="text-muted-foreground py-4 text-center text-sm">
                    오늘은 휴무입니다
                  </p>
                ) : (
                  <div className="space-y-3">
                    {/* 영업시간 */}
                    <div>
                      <Label className="text-muted-foreground mb-1 block text-xs">
                        영업시간
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="time"
                          value={rule.openTime}
                          onChange={(e) =>
                            updateRule(rule.dayOfWeek, { openTime: e.target.value })
                          }
                          className="flex-1"
                        />
                        <span className="text-muted-foreground">~</span>
                        <Input
                          type="time"
                          value={rule.closeTime}
                          onChange={(e) =>
                            updateRule(rule.dayOfWeek, { closeTime: e.target.value })
                          }
                          className="flex-1"
                        />
                      </div>
                    </div>

                    {/* 점심시간 */}
                    <div>
                      <div className="mb-1 flex items-center justify-between">
                        <Label className="text-muted-foreground text-xs">점심시간</Label>
                        <Switch
                          checked={rule.hasLunch ?? false}
                          onCheckedChange={(checked) =>
                            updateRule(rule.dayOfWeek, {
                              hasLunch: checked,
                              lunchStart: checked
                                ? rule.lunchStart ?? "13:00"
                                : rule.lunchStart,
                              lunchEnd: checked ? rule.lunchEnd ?? "14:00" : rule.lunchEnd,
                            })
                          }
                        />
                      </div>
                      {rule.hasLunch ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="time"
                            value={rule.lunchStart ?? "13:00"}
                            onChange={(e) =>
                              updateRule(rule.dayOfWeek, { lunchStart: e.target.value })
                            }
                            className="flex-1"
                          />
                          <span className="text-muted-foreground">~</span>
                          <Input
                            type="time"
                            value={rule.lunchEnd ?? "14:00"}
                            onChange={(e) =>
                              updateRule(rule.dayOfWeek, { lunchEnd: e.target.value })
                            }
                            className="flex-1"
                          />
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-xs italic">점심시간 없음</p>
                      )}
                    </div>

                    <div className="text-muted-foreground border-t pt-2 text-xs">
                      자동 초기화: {rule.closeTime} + 2시간
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <Button onClick={handleSave} disabled={saving}>
            <Settings className="mr-2 h-4 w-4" />
            {saving ? "저장 중..." : "운영시간 저장"}
          </Button>
        </CardContent>
      </Card>

      <Separator />

      {/* 데이터 관리 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            데이터 관리
          </CardTitle>
          <CardDescription>대기열 데이터를 관리합니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>대기열 수동 초기화</Label>
              <p className="text-muted-foreground text-sm">
                모든 대기열 데이터를 즉시 삭제합니다. (복구 불가)
              </p>
              {lastResetDate && (
                <p className="text-muted-foreground text-xs">
                  마지막 자동 초기화: {lastResetDate}
                </p>
              )}
            </div>
            <Button variant="destructive" size="sm" onClick={handleReset}>
              초기화
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
