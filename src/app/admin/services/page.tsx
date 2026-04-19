"use client";

import type { ChangeEvent } from "react";
import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Edit, Trash2, Save, X, AlertTriangle, Download, RefreshCw, Sparkles } from "lucide-react";
import type { ServiceItem } from "@/types/domain";
import { Collapse } from "@/components/ui/collapse";
import {
  calculateWaitTimeStats,
  getDefaultWaitTimeStrategy,
  parseWaitTimeCsv,
  type WaitTimeStat,
} from "@/lib/waitTimeImport";
import {
  useServices,
  useServiceMutations,
  useServiceStats,
  useApplyAutoUpdate,
} from "@/lib/useMasterData";
import { ServiceQuickAdd } from "@/components/admin/service-quick-add";
import { toast } from "sonner";
import { useConfirm } from "@/components/confirm-dialog";

export default function ServicesPage() {
  const confirm = useConfirm();
  const { data: services = [], isLoading } = useServices(false);
  const { create, update, remove } = useServiceMutations();
  const { data: statsData } = useServiceStats();
  const applyAuto = useApplyAutoUpdate();
  const stats = statsData?.stats ?? [];
  const minSamples = statsData?.minSamples ?? 3;
  const statByServiceId = new Map(stats.map((s) => [s.serviceId, s]));
  const [autoApplyResult, setAutoApplyResult] = useState<{
    updated: number;
    skipped: number;
  } | null>(null);

  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [formData, setFormData] = useState({
    label: "",
    waitTime: "",
  });
  const [csvMeta, setCsvMeta] = useState<{
    filename: string;
    patientCount: number;
    strategyLabel: string;
  } | null>(null);
  const [derivedWaits, setDerivedWaits] = useState<WaitTimeStat[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [applySummary, setApplySummary] = useState<{ updated: number; created: number } | null>(
    null
  );
  const [isProcessingCsv, setIsProcessingCsv] = useState(false);
  const [isConfirmingApply, setIsConfirmingApply] = useState(false);

  const confirmStats = useMemo(() => {
    return derivedWaits.reduce(
      (acc, item) => {
        const exists = services.some(
          (s) => s.label === item.label || s.value === item.value
        );
        if (exists) acc.update += 1;
        else acc.create += 1;
        return acc;
      },
      { update: 0, create: 0 }
    );
  }, [derivedWaits, services]);

  const handleCsvUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsProcessingCsv(true);
    setUploadError(null);
    setCsvMeta(null);
    setDerivedWaits([]);
    setApplySummary(null);
    setIsConfirmingApply(false);

    try {
      const text = await file.text();
      const dataset = parseWaitTimeCsv(text);
      const result = calculateWaitTimeStats(dataset, getDefaultWaitTimeStrategy());
      setCsvMeta({
        filename: file.name,
        patientCount: result.patientCount,
        strategyLabel: result.strategy.label,
      });
      setDerivedWaits(result.stats);
    } catch (error) {
      const message = error instanceof Error ? error.message : "CSV 파싱 중 오류가 발생했습니다.";
      setUploadError(message);
    } finally {
      setIsProcessingCsv(false);
    }
  };

  const handleOpenConfirm = () => {
    if (!derivedWaits.length) return;
    setApplySummary(null);
    setIsConfirmingApply(true);
  };

  const handleCancelConfirm = () => setIsConfirmingApply(false);

  const applyDerivedWaitTimes = async () => {
    if (!derivedWaits.length) return;

    let updated = 0;
    let created = 0;

    for (const result of derivedWaits) {
      const existing = services.find(
        (s) => s.label === result.label || s.value === result.value
      );

      try {
        if (existing) {
          await update.mutateAsync({ id: existing.id, waitTime: result.waitTime });
          updated += 1;
        } else {
          await create.mutateAsync({
            value: result.value,
            label: result.label,
            waitTime: result.waitTime,
            isActive: true,
          });
          created += 1;
        }
      } catch (err) {
        console.error(`[applyDerivedWaitTimes] ${result.label} 실패:`, err);
      }
    }

    setApplySummary({ updated, created });
    setIsConfirmingApply(false);
  };

  const handleUpdateService = async () => {
    if (!editingService) return;
    const label = formData.label.trim();
    const waitTime = parseInt(formData.waitTime, 10);
    if (!label || !Number.isFinite(waitTime) || waitTime <= 0 || waitTime > 1440) {
      toast.error("항목명과 1~1440 사이의 대기시간을 입력해주세요.");
      return;
    }
    try {
      await update.mutateAsync({
        id: editingService.id,
        value: label,
        label,
        waitTime,
      });
      toast.success("수정되었습니다");
      setEditingService(null);
      setFormData({ label: "", waitTime: "" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "수정 실패");
    }
  };

  const handleDeleteService = async (id: number) => {
    const ok = await confirm({
      title: "진료항목 삭제",
      description: "비활성 처리되며 기존 접수 기록은 보존됩니다. 계속하시겠습니까?",
      confirmText: "삭제",
      destructive: true,
    });
    if (!ok) return;
    try {
      await remove.mutateAsync(id);
      toast.success("삭제되었습니다");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "삭제 실패");
    }
  };

  const toggleServiceStatus = async (service: ServiceItem) => {
    try {
      await update.mutateAsync({ id: service.id, isActive: !service.isActive });
      toast.success(service.isActive ? "비활성화됨" : "활성화됨");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "상태 변경 실패");
    }
  };

  const toggleAutoUpdate = async (service: ServiceItem, next: boolean) => {
    try {
      await update.mutateAsync({ id: service.id, autoUpdate: next });
      toast.success(`자동 갱신 ${next ? "ON" : "OFF"}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "자동 갱신 설정 실패");
    }
  };

  const handleApplyAuto = async () => {
    const ok = await confirm({
      title: "실측 기반 자동 갱신",
      description:
        "자동 갱신 모드가 켜진 진료항목의 예상 시간을 실측 평균으로 덮어씁니다. 계속하시겠습니까?",
      confirmText: "갱신",
    });
    if (!ok) return;
    try {
      const res = await applyAuto.mutateAsync();
      setAutoApplyResult({ updated: res.updated, skipped: res.skipped });
      toast.success(`${res.updated}건 갱신 완료`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "자동 갱신 실패");
    }
  };

  const startEdit = (service: ServiceItem) => {
    setEditingService(service);
    setFormData({
      label: service.label,
      waitTime: service.waitTime.toString(),
    });
  };

  const cancelEdit = () => {
    setEditingService(null);
    setFormData({ label: "", waitTime: "" });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <RefreshCw className="mx-auto mb-4 h-8 w-8 animate-spin" />
          <p>진료항목 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          진료항목을 수정하면 기존 대기열의 예상 대기시간에 영향을 줄 수 있습니다.
        </AlertDescription>
      </Alert>

      {/* 실측 기반 자동 갱신 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                실측 기반 예상 대기시간 자동 갱신
              </CardTitle>
              <CardDescription>
                각 진료항목을 단일로 받은 완료 환자의 실제 진료시간(진료시작~완료)을 기반으로 평균을
                계산합니다. 자동 갱신을 켠 항목만 한 번에 덮어씁니다.
              </CardDescription>
            </div>
            <Button
              onClick={handleApplyAuto}
              disabled={applyAuto.isPending || !services.some((s) => s.autoUpdate)}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {applyAuto.isPending ? "갱신 중..." : "지금 자동 갱신"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {autoApplyResult && (
            <Alert className="mb-4">
              <AlertDescription>
                {autoApplyResult.updated}건 갱신, {autoApplyResult.skipped}건 표본 부족으로 스킵.
              </AlertDescription>
            </Alert>
          )}
          <p className="text-muted-foreground text-xs">
            표본 수 {minSamples}건 미만은 신뢰도 부족으로 통계 미표시 및 자동 갱신에서 제외됩니다. 상하위 10%는 절사합니다.
          </p>
        </CardContent>
      </Card>

      {/* CSV 업로드 */}
      <Card>
        <CardHeader>
          <CardTitle>CSV 기반 예상 대기시간 자동 산출</CardTitle>
          <CardDescription>
            환자별 대기시간 데이터(csv)를 업로드하면 진료 유형별 평균 대기시간을 계산하고 즉시
            적용할 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="csv-upload" className="text-sm font-medium">
                Raw data 업로드 (CSV)
              </Label>
              <Input
                id="csv-upload"
                type="file"
                accept=".csv"
                onChange={handleCsvUpload}
                disabled={isProcessingCsv}
              />
              <div className="flex items-center justify-between gap-2">
                <p className="text-muted-foreground text-xs">
                  포맷: <code className="rounded bg-muted px-1">진료항목,대기시간(분)</code> — 한 행에 하나의 진료 기록.
                </p>
                <Button type="button" variant="outline" size="sm" asChild className="shrink-0">
                  <a href="/templates/wait-time-template.csv" download>
                    <Download className="mr-1 h-3 w-3" />
                    템플릿 다운로드
                  </a>
                </Button>
              </div>
            </div>
            {csvMeta && (
              <div className="bg-muted/30 rounded-lg border p-4 text-sm">
                <p className="font-medium">{csvMeta.filename}</p>
                <p className="text-muted-foreground">
                  총 환자 수: {csvMeta.patientCount.toLocaleString()}명
                </p>
                <p className="text-muted-foreground">통계 방식: {csvMeta.strategyLabel}</p>
              </div>
            )}
          </div>

          {uploadError && (
            <Alert variant="destructive">
              <AlertDescription>{uploadError}</AlertDescription>
            </Alert>
          )}

          {derivedWaits.length > 0 && (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">도출된 진료항목: {derivedWaits.length}개</p>
                  <p className="text-muted-foreground text-sm">
                    {csvMeta?.strategyLabel ?? "평균"} 기반으로 계산됩니다.
                  </p>
                </div>
                <Button onClick={handleOpenConfirm} disabled={isProcessingCsv}>
                  결과값 자동 적용
                </Button>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {derivedWaits.map((item) => (
                  <div key={item.label} className="rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{item.label}</p>
                      <Badge variant="secondary">{item.waitTime}분</Badge>
                    </div>
                    <p className="text-muted-foreground text-sm">표본 수: {item.sampleSize}명</p>
                  </div>
                ))}
              </div>

              {isConfirmingApply && (
                <Alert>
                  <AlertDescription className="space-y-3">
                    <p>
                      기존 진료항목 {confirmStats.update}개를 업데이트하고, 신규 진료항목{" "}
                      {confirmStats.create}개를 추가합니다. 계속 진행할까요?
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" onClick={applyDerivedWaitTimes}>
                        확인
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleCancelConfirm}>
                        취소
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {applySummary && (
                <Alert>
                  <AlertDescription>
                    기존 항목 {applySummary.updated}개 업데이트, 신규 항목 {applySummary.created}개
                    추가 완료.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>진료항목 목록</CardTitle>
          <CardDescription>
            항목명과 대기시간을 입력하거나 프리셋에서 선택해서 바로 추가할 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ServiceQuickAdd
            existingServices={services}
            onAdd={async (data) => {
              try {
                await create.mutateAsync({
                  value: data.value,
                  label: data.label,
                  waitTime: data.waitTime,
                  isActive: true,
                });
                toast.success(`${data.label} 추가됨`);
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "추가 실패");
                throw err;
              }
            }}
            isPending={create.isPending}
          />
          {services.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">등록된 진료항목이 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {services.map((service) => {
                const stat = statByServiceId.get(service.id);
                const diff =
                  stat?.avgMinutes != null ? stat.avgMinutes - service.waitTime : null;
                return (
                <div
                  key={service.id}
                  className={`rounded-lg border ${!service.isActive ? "opacity-60" : ""}`}
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="mb-2 flex items-center gap-3">
                          <div className="font-medium">{service.label}</div>
                          <Badge variant="secondary">{service.waitTime}분</Badge>
                          {service.autoUpdate && (
                            <Badge className="bg-primary/10 text-primary">자동 갱신</Badge>
                          )}
                          {!service.isActive && <Badge variant="destructive">비활성</Badge>}
                        </div>
                        <div className="text-muted-foreground text-sm">
                          {stat && stat.sampleSize > 0 ? (
                            stat.avgMinutes != null ? (
                              <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                <span>
                                  실측 평균 <span className="text-foreground font-medium">{stat.avgMinutes}분</span>
                                </span>
                                <span>중앙값 {stat.medianMinutes}분</span>
                                <span>
                                  범위 {stat.minMinutes}~{stat.maxMinutes}분
                                </span>
                                <span>표본 {stat.sampleSize}건</span>
                                {diff != null && diff !== 0 && (
                                  <span
                                    className={
                                      diff > 0 ? "text-orange-600" : "text-green-600"
                                    }
                                  >
                                    설정값 대비 {diff > 0 ? "+" : ""}
                                    {diff}분
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span>
                                표본 {stat.sampleSize}건 (최소 {minSamples}건 필요 — 통계 미표시)
                              </span>
                            )
                          ) : (
                            <span>아직 실측 데이터 없음</span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground text-xs">자동 갱신</span>
                          <Switch
                            checked={service.autoUpdate}
                            onCheckedChange={(checked) => toggleAutoUpdate(service, checked)}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => toggleServiceStatus(service)}
                            variant="outline"
                            size="sm"
                          >
                            {service.isActive ? "비활성화" : "활성화"}
                          </Button>
                          <Button
                            onClick={() => startEdit(service)}
                            variant="outline"
                            size="sm"
                            aria-expanded={editingService?.id === service.id}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => handleDeleteService(service.id)}
                            variant="outline"
                            size="sm"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Collapse open={editingService?.id === service.id} className="bg-white">
                    <div className="transform space-y-4 px-4 pt-2 pb-4">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>항목명 *</Label>
                          <Input
                            value={formData.label}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, label: e.target.value }))
                            }
                            maxLength={50}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>예상 대기시간 (분) *</Label>
                          <Input
                            type="number"
                            min={1}
                            max={1440}
                            value={formData.waitTime}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, waitTime: e.target.value }))
                            }
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-3 pt-2">
                        <Button onClick={cancelEdit} variant="outline" size="sm">
                          <X className="mr-2 h-4 w-4" />
                          취소
                        </Button>
                        <Button onClick={handleUpdateService} size="sm" disabled={update.isPending}>
                          <Save className="mr-2 h-4 w-4" />
                          {update.isPending ? "저장 중..." : "저장"}
                        </Button>
                      </div>
                    </div>
                  </Collapse>
                </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
