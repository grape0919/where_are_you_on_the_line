"use client";

import type { ChangeEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Edit, Trash2, Save, X, AlertTriangle } from "lucide-react";
import { ensureDefaultServices, getJSON, setJSON } from "@/lib/storage";
import { LS_KEYS } from "@/lib/constants";
import type { ServiceItem } from "@/types/domain";
import { Collapse } from "@/components/ui/collapse";
import {
  calculateWaitTimeStats,
  getDefaultWaitTimeStrategy,
  parseWaitTimeCsv,
  type WaitTimeStat,
} from "@/lib/waitTimeImport";

// types imported

export default function ServicesPage() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    value: "",
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
          (service) => service.label === item.label || service.value === item.value
        );
        if (exists) {
          acc.update += 1;
        } else {
          acc.create += 1;
        }
        return acc;
      },
      { update: 0, create: 0 }
    );
  }, [derivedWaits, services]);

  // 진료항목 목록 조회
  const fetchServices = async () => {
    try {
      ensureDefaultServices();
      const list = getJSON<ServiceItem[]>(LS_KEYS.services) || [];
      setServices(list);
    } catch (error) {
      console.error("진료항목 조회 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  // 진료항목 저장
  const saveServices = (newServices: ServiceItem[]) => {
    setJSON(LS_KEYS.services, newServices);
    setServices(newServices);
  };

  /**
   * handleCsvUpload reads the uploaded CSV file and derives wait times.
   */
  const handleCsvUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

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

  /**
   * handleOpenConfirm prompts the confirm UI for applying derived waits.
   */
  const handleOpenConfirm = () => {
    if (!derivedWaits.length) return;
    setApplySummary(null);
    setIsConfirmingApply(true);
  };

  /**
   * handleCancelConfirm closes the confirm prompt without applying.
   */
  const handleCancelConfirm = () => {
    setIsConfirmingApply(false);
  };

  /**
   * applyDerivedWaitTimes updates existing services or creates new ones with derived waits.
   */
  const applyDerivedWaitTimes = () => {
    if (!derivedWaits.length) return;

    const nextServices = [...services];
    let updated = 0;
    let created = 0;

    derivedWaits.forEach((result) => {
      const targetIndex = nextServices.findIndex(
        (service) => service.label === result.label || service.value === result.value
      );

      if (targetIndex >= 0) {
        nextServices[targetIndex] = { ...nextServices[targetIndex], waitTime: result.waitTime };
        updated += 1;
      } else {
        const newService: ServiceItem = {
          id: `auto-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          value: result.value,
          label: result.label,
          waitTime: result.waitTime,
          isActive: true,
        };
        nextServices.push(newService);
        created += 1;
      }
    });

    saveServices(nextServices);
    setApplySummary({ updated, created });
    setIsConfirmingApply(false);
  };

  // 진료항목 추가
  const addService = () => {
    if (!formData.value || !formData.label || !formData.waitTime) {
      alert("모든 필드를 입력해주세요.");
      return;
    }

    const newService: ServiceItem = {
      id: Date.now().toString(),
      value: formData.value,
      label: formData.label,
      waitTime: parseInt(formData.waitTime),
      isActive: true,
    };

    const updatedServices = [...services, newService];
    saveServices(updatedServices);

    // 폼 초기화
    setFormData({ value: "", label: "", waitTime: "" });
    setIsAdding(false);
  };

  // 진료항목 수정
  const updateService = () => {
    if (!editingService || !formData.value || !formData.label || !formData.waitTime) {
      alert("모든 필드를 입력해주세요.");
      return;
    }

    const updatedServices = services.map((service) =>
      service.id === editingService.id
        ? {
            ...service,
            value: formData.value,
            label: formData.label,
            waitTime: parseInt(formData.waitTime),
          }
        : service
    );

    saveServices(updatedServices);

    // 편집 모드 종료
    setEditingService(null);
    setFormData({ value: "", label: "", waitTime: "" });
  };

  // 진료항목 삭제
  const deleteService = (id: string) => {
    if (!confirm("정말로 이 진료항목을 삭제하시겠습니까?")) return;

    const updatedServices = services.filter((service) => service.id !== id);
    saveServices(updatedServices);
  };

  // 진료항목 활성화/비활성화 토글
  const toggleServiceStatus = (id: string) => {
    const updatedServices = services.map((service) =>
      service.id === id ? { ...service, isActive: !service.isActive } : service
    );
    saveServices(updatedServices);
  };

  // 편집 모드 시작
  const startEdit = (service: ServiceItem) => {
    setEditingService(service);
    setFormData({
      value: service.value,
      label: service.label,
      waitTime: service.waitTime.toString(),
    });
    setIsAdding(false);
  };

  // 편집 취소
  const cancelEdit = () => {
    setEditingService(null);
    setFormData({ value: "", label: "", waitTime: "" });
    setIsAdding(false);
  };

  // 추가 모드 시작
  const startAdd = () => {
    setIsAdding(true);
    setEditingService(null);
    setFormData({ value: "", label: "", waitTime: "" });
  };

  useEffect(() => {
    fetchServices();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
          <p>진료항목 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* 알림 */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          진료항목을 수정하면 기존 대기열의 예상 대기시간에 영향을 줄 수 있습니다.
        </AlertDescription>
      </Alert>

      {/* CSV 업로드 및 자동 산출 */}
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
              <p className="text-muted-foreground text-xs">
                헤더는 허리치료, 무릎치료, 어깨치료, 목치료, 손/팔꿈치 치료 순서를 따라야 합니다.
              </p>
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
                    현재는 {csvMeta?.strategyLabel ?? "평균"} 기반으로 계산되며, 추후 다른
                    알고리즘으로 확장될 수 있습니다.
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

      {/* 진료항목 목록 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>진료항목 목록</CardTitle>
              <CardDescription>
                현재 등록된 진료항목들입니다. 수정하거나 삭제할 수 있습니다.
              </CardDescription>
            </div>
            <Button onClick={startAdd}>
              <Plus className="mr-2 h-4 w-4" />
              진료항목 추가
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {services.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">등록된 진료항목이 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {services.map((service) => (
                <div
                  key={service.id}
                  className={`rounded-lg border ${!service.isActive ? "opacity-60" : ""}`}
                >
                  {/* 서비스 정보 표시 */}
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="mb-2 flex items-center gap-4">
                          <div className="font-medium">{service.label}</div>
                          <Badge variant="outline">{service.value}</Badge>
                          <Badge variant="secondary">{service.waitTime}분</Badge>
                          {!service.isActive && <Badge variant="destructive">비활성</Badge>}
                        </div>
                        <div className="text-muted-foreground text-sm">ID: {service.id}</div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => toggleServiceStatus(service.id)}
                          variant="outline"
                          size="sm"
                        >
                          {service.isActive ? "비활성화" : "활성화"}
                        </Button>
                        <Button
                          id={`edit-trigger-${service.id}`}
                          onClick={() => startEdit(service)}
                          variant="outline"
                          size="sm"
                          aria-expanded={editingService?.id === service.id}
                          aria-controls={`edit-panel-${service.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => deleteService(service.id)}
                          variant="outline"
                          size="sm"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* 편집 폼 (접을 수 있는 스타일) */}
                  <Collapse open={editingService?.id === service.id} className="bg-white">
                    <div
                      id={`edit-panel-${service.id}`}
                      className="transform space-y-4 px-4 pt-2 pb-4"
                      role="region"
                      aria-labelledby={`edit-trigger-${service.id}`}
                    >
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                          <Label htmlFor={`value-${service.id}`} className="text-sm font-medium">
                            항목 코드
                          </Label>
                          <Input
                            id={`value-${service.id}`}
                            placeholder="예: general"
                            value={formData.value}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, value: e.target.value }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`label-${service.id}`} className="text-sm font-medium">
                            항목명
                          </Label>
                          <Input
                            id={`label-${service.id}`}
                            placeholder="예: 일반진료"
                            value={formData.label}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, label: e.target.value }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`waitTime-${service.id}`} className="text-sm font-medium">
                            예상 대기시간 (분)
                          </Label>
                          <Input
                            id={`waitTime-${service.id}`}
                            type="number"
                            placeholder="예: 10"
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
                        <Button onClick={updateService} size="sm">
                          <Save className="mr-2 h-4 w-4" />
                          저장
                        </Button>
                      </div>
                    </div>
                  </Collapse>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 추가 폼 */}
      {isAdding && (
        <Card>
          <CardHeader>
            <CardTitle>진료항목 추가</CardTitle>
            <CardDescription>새로운 진료항목을 추가합니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="value" className="text-sm font-medium">
                    항목 코드
                  </Label>
                  <Input
                    id="value"
                    placeholder="예: general"
                    value={formData.value}
                    onChange={(e) => setFormData((prev) => ({ ...prev, value: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="label" className="text-sm font-medium">
                    항목명
                  </Label>
                  <Input
                    id="label"
                    placeholder="예: 일반진료"
                    value={formData.label}
                    onChange={(e) => setFormData((prev) => ({ ...prev, label: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="waitTime" className="text-sm font-medium">
                    예상 대기시간 (분)
                  </Label>
                  <Input
                    id="waitTime"
                    type="number"
                    placeholder="예: 10"
                    value={formData.waitTime}
                    onChange={(e) => setFormData((prev) => ({ ...prev, waitTime: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button onClick={cancelEdit} variant="outline">
                  <X className="mr-2 h-4 w-4" />
                  취소
                </Button>
                <Button onClick={addService}>
                  <Save className="mr-2 h-4 w-4" />
                  추가
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
