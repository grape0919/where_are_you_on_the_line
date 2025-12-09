"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Collapse } from "@/components/ui/collapse";
import { Trash2, PencilLine, RefreshCw, Info, Plus, Save, X } from "lucide-react";
import {
  ensureDefaultReservationCapacity,
  ensureDefaultServices,
  getActiveServices,
  getReservationCapacityRules,
  setReservationCapacityRules,
} from "@/lib/storage";
import { WEEKDAYS } from "@/lib/constants";
import { getReservationLimits } from "@/lib/useReservation";
import type { ReservationCapacityRule, WeekdayToken } from "@/types/domain";

type CapacityFormState = {
  service: string;
  dayOfWeek: WeekdayToken;
  perSlot: string;
  perDay: string;
  note: string;
  isActive: boolean;
};

const DEFAULT_FORM: CapacityFormState = {
  service: "ALL",
  dayOfWeek: "ALL",
  perSlot: "",
  perDay: "",
  note: "",
  isActive: true,
};

const SAMPLE_DATE_BY_DAY: Record<WeekdayToken, string | undefined> = {
  ALL: undefined,
  MON: "2025-01-06",
  TUE: "2025-01-07",
  WED: "2025-01-08",
  THU: "2025-01-09",
  FRI: "2025-01-10",
  SAT: "2025-01-11",
  SUN: "2025-01-12",
};

export default function ReservationCapacityPage() {
  const [rules, setRules] = useState<ReservationCapacityRule[]>([]);
  const [services, setServices] = useState<{ value: string; label: string }[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [addForm, setAddForm] = useState<CapacityFormState>(DEFAULT_FORM);
  const [editingRule, setEditingRule] = useState<ReservationCapacityRule | null>(null);
  const [editForm, setEditForm] = useState<CapacityFormState>(DEFAULT_FORM);

  const weekdayLabels = useMemo(
    () => Object.fromEntries(WEEKDAYS.map((item) => [item.value, item.label])),
    []
  );

  const loadServices = useCallback(() => {
    ensureDefaultServices();
    const active = getActiveServices();
    setServices([{ value: "ALL", label: "모든 서비스" }, ...active]);
  }, []);

  const loadRules = useCallback(() => {
    ensureDefaultReservationCapacity();
    setRules(getReservationCapacityRules());
  }, []);

  useEffect(() => {
    loadServices();
    loadRules();
  }, [loadServices, loadRules]);

  const updateRules = (next: ReservationCapacityRule[]) => {
    setReservationCapacityRules(next);
    setRules(next);
  };

  const parseFormValues = (form: CapacityFormState) => {
    const perSlot = form.perSlot.trim() ? Number(form.perSlot) : null;
    const perDay = form.perDay.trim() ? Number(form.perDay) : null;

    if (perSlot !== null && (Number.isNaN(perSlot) || perSlot <= 0)) {
      alert("시간대 정원은 1 이상의 숫자여야 합니다.");
      return null;
    }
    if (perDay !== null && (Number.isNaN(perDay) || perDay <= 0)) {
      alert("일일 정원은 1 이상의 숫자여야 합니다.");
      return null;
    }

    return { perSlot, perDay };
  };

  const handleAddChange =
    <Key extends keyof CapacityFormState>(key: Key) =>
    (value: CapacityFormState[Key]) => {
      setAddForm((prev) => ({ ...prev, [key]: value }));
    };

  const handleEditChange =
    <Key extends keyof CapacityFormState>(key: Key) =>
    (value: CapacityFormState[Key]) => {
      setEditForm((prev) => ({ ...prev, [key]: value }));
    };

  const ensureServiceOption = (service: string) => {
    if (!service) return;
    setServices((prev) => {
      if (prev.some((option) => option.value === service)) return prev;
      return [...prev, { value: service, label: service }];
    });
  };

  const startAdd = () => {
    setIsAdding(true);
    setEditingRule(null);
    setEditForm(DEFAULT_FORM);
    setAddForm(DEFAULT_FORM);
  };

  const cancelAdd = () => {
    setIsAdding(false);
    setAddForm(DEFAULT_FORM);
  };

  const addRule = () => {
    const parsed = parseFormValues(addForm);
    if (!parsed) return;

    const newRule: ReservationCapacityRule = {
      id: crypto.randomUUID(),
      service: addForm.service,
      dayOfWeek: addForm.dayOfWeek,
      perSlot: parsed.perSlot,
      perDay: parsed.perDay,
      note: addForm.note.trim() || undefined,
      isActive: addForm.isActive,
    };

    updateRules([...rules, newRule]);
    cancelAdd();
  };

  const startEdit = (rule: ReservationCapacityRule) => {
    ensureServiceOption(rule.service);
    setEditingRule(rule);
    setIsAdding(false);
    setAddForm(DEFAULT_FORM);
    setEditForm({
      service: rule.service,
      dayOfWeek: rule.dayOfWeek,
      perSlot: rule.perSlot != null ? String(rule.perSlot) : "",
      perDay: rule.perDay != null ? String(rule.perDay) : "",
      note: rule.note ?? "",
      isActive: rule.isActive,
    });
  };

  const cancelEdit = () => {
    setEditingRule(null);
    setEditForm(DEFAULT_FORM);
  };

  const updateRule = () => {
    if (!editingRule) return;
    const parsed = parseFormValues(editForm);
    if (!parsed) return;

    const nextRule: ReservationCapacityRule = {
      ...editingRule,
      service: editForm.service,
      dayOfWeek: editForm.dayOfWeek,
      perSlot: parsed.perSlot,
      perDay: parsed.perDay,
      note: editForm.note.trim() || undefined,
      isActive: editForm.isActive,
    };

    const nextRules = rules.map((rule) => (rule.id === editingRule.id ? nextRule : rule));
    updateRules(nextRules);
    cancelEdit();
  };

  const handleDelete = (id: string) => {
    if (!confirm("해당 설정을 삭제하시겠습니까?")) return;
    const nextRules = rules.filter((rule) => rule.id !== id);
    updateRules(nextRules);
    if (editingRule?.id === id) {
      cancelEdit();
    }
  };

  const handleToggleActive = (id: string, value: boolean) => {
    const nextRules = rules.map((rule) => (rule.id === id ? { ...rule, isActive: value } : rule));
    updateRules(nextRules);
    if (editingRule?.id === id) {
      setEditForm((prev) => ({ ...prev, isActive: value }));
    }
  };

  const serviceLabelMap = useMemo(
    () => Object.fromEntries(services.map((service) => [service.value, service.label])),
    [services]
  );

  const sortedRules = useMemo(
    () =>
      [...rules].sort((a, b) => {
        if (a.service === b.service) {
          return a.dayOfWeek.localeCompare(b.dayOfWeek);
        }
        if (a.service === "ALL") return -1;
        if (b.service === "ALL") return 1;
        return a.service.localeCompare(b.service);
      }),
    [rules]
  );

  const addDefaultLimits = useMemo(() => {
    const service = addForm.service === "ALL" ? undefined : addForm.service;
    const date = SAMPLE_DATE_BY_DAY[addForm.dayOfWeek];
    return getReservationLimits(service, date);
  }, [addForm.service, addForm.dayOfWeek, rules]);

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>예약 정원 설정</CardTitle>
            <CardDescription>
              서비스/요일 별 정원을 정의합니다. 규칙을 비우면 환경 변수 기본값이 사용됩니다.
            </CardDescription>
          </div>
          <Button onClick={() => (isAdding ? cancelAdd() : startAdd())}>
            {isAdding ? (
              <>
                <X className="mr-2 h-4 w-4" /> 추가 취소
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" /> 정원 규칙 추가
              </>
            )}
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              기본 정원은 `NEXT_PUBLIC_RESERVATION_MAX_PER_SLOT`,
              `NEXT_PUBLIC_RESERVATION_MAX_PER_DAY` 값을 따릅니다. 규칙을 추가하면 해당 조건에 우선
              적용됩니다.
            </AlertDescription>
          </Alert>

          <Collapse open={isAdding} className="rounded-lg border">
            <div className="space-y-6 p-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>서비스</Label>
                  <Select value={addForm.service} onValueChange={handleAddChange("service")}>
                    <SelectTrigger>
                      <SelectValue placeholder="서비스를 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((service) => (
                        <SelectItem key={service.value} value={service.value}>
                          {service.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>요일</Label>
                  <Select
                    value={addForm.dayOfWeek}
                    onValueChange={(value: WeekdayToken) => handleAddChange("dayOfWeek")(value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="요일을 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {WEEKDAYS.map((day) => (
                        <SelectItem key={day.value} value={day.value}>
                          {day.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="add-slot">시간대 정원</Label>
                  <Input
                    id="add-slot"
                    type="number"
                    min={1}
                    placeholder={`기본 ${addDefaultLimits.perSlot}명`}
                    value={addForm.perSlot}
                    onChange={(event) => handleAddChange("perSlot")(event.target.value)}
                  />
                  <p className="text-muted-foreground text-xs">
                    비워두면 기본 {addDefaultLimits.perSlot}명이 적용됩니다.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="add-day">일일 정원</Label>
                  <Input
                    id="add-day"
                    type="number"
                    min={1}
                    placeholder={`기본 ${addDefaultLimits.perDay}명`}
                    value={addForm.perDay}
                    onChange={(event) => handleAddChange("perDay")(event.target.value)}
                  />
                  <p className="text-muted-foreground text-xs">
                    비워두면 기본 {addDefaultLimits.perDay}명이 적용됩니다.
                  </p>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="add-note">메모</Label>
                  <Input
                    id="add-note"
                    placeholder="내부 메모 (선택)"
                    value={addForm.note}
                    onChange={(event) => handleAddChange("note")(event.target.value)}
                  />
                </div>
                <div className="flex items-center justify-between md:col-span-2">
                  <div className="space-y-1">
                    <Label htmlFor="add-active">활성화</Label>
                    <p className="text-muted-foreground text-xs">
                      비활성화하면 해당 규칙은 적용되지 않습니다.
                    </p>
                  </div>
                  <Switch
                    id="add-active"
                    checked={addForm.isActive}
                    onCheckedChange={(checked) => handleAddChange("isActive")(checked)}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={cancelAdd}>
                  <X className="mr-2 h-4 w-4" /> 취소
                </Button>
                <Button onClick={addRule}>
                  <Save className="mr-2 h-4 w-4" /> 규칙 추가
                </Button>
              </div>
            </div>
          </Collapse>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle>정원 규칙 목록</CardTitle>
            <CardDescription>
              서비스/요일 특화 규칙이 일반 규칙보다 우선 적용됩니다. 필요 시 새로고침하세요.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadServices}>
              <RefreshCw className="mr-2 h-4 w-4" /> 서비스 새로고침
            </Button>
            <Button variant="outline" size="sm" onClick={loadRules}>
              <RefreshCw className="mr-2 h-4 w-4" /> 규칙 새로고침
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {sortedRules.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center">
              등록된 정원 규칙이 없습니다.
            </div>
          ) : (
            <div className="space-y-4">
              {sortedRules.map((rule) => (
                <div key={rule.id} className="rounded-lg border">
                  <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">
                          {serviceLabelMap[rule.service] ?? rule.service}
                        </Badge>
                        <Badge variant="secondary">
                          {weekdayLabels[rule.dayOfWeek] ?? rule.dayOfWeek}
                        </Badge>
                        {rule.isActive ? (
                          <Badge variant="default">활성</Badge>
                        ) : (
                          <Badge variant="outline">비활성</Badge>
                        )}
                      </div>
                      <div className="text-muted-foreground text-sm">
                        시간대 정원: {rule.perSlot ?? "기본"} · 일일 정원: {rule.perDay ?? "기본"}
                        {rule.note ? ` · ${rule.note}` : ""}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-2">
                        <Label className="text-muted-foreground text-xs">활성화</Label>
                        <Switch
                          checked={rule.isActive}
                          onCheckedChange={(checked) => handleToggleActive(rule.id, checked)}
                          aria-label="규칙 활성화 토글"
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startEdit(rule)}
                        aria-label="규칙 수정"
                      >
                        <PencilLine className="mr-1 h-4 w-4" /> 수정
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(rule.id)}
                        aria-label="규칙 삭제"
                      >
                        <Trash2 className="mr-1 h-4 w-4" /> 삭제
                      </Button>
                    </div>
                  </div>
                  <Collapse open={editingRule?.id === rule.id} className="">
                    <div className="space-y-4 px-4 pt-2 pb-4">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>서비스</Label>
                          <Select
                            value={editForm.service}
                            onValueChange={handleEditChange("service")}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="서비스를 선택하세요" />
                            </SelectTrigger>
                            <SelectContent>
                              {services.map((service) => (
                                <SelectItem key={service.value} value={service.value}>
                                  {service.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>요일</Label>
                          <Select
                            value={editForm.dayOfWeek}
                            onValueChange={(value: WeekdayToken) =>
                              handleEditChange("dayOfWeek")(value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="요일을 선택하세요" />
                            </SelectTrigger>
                            <SelectContent>
                              {WEEKDAYS.map((day) => (
                                <SelectItem key={day.value} value={day.value}>
                                  {day.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`edit-slot-${rule.id}`}>시간대 정원</Label>
                          <Input
                            id={`edit-slot-${rule.id}`}
                            type="number"
                            min={1}
                            placeholder="비워두면 기본 적용"
                            value={editForm.perSlot}
                            onChange={(event) => handleEditChange("perSlot")(event.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`edit-day-${rule.id}`}>일일 정원</Label>
                          <Input
                            id={`edit-day-${rule.id}`}
                            type="number"
                            min={1}
                            placeholder="비워두면 기본 적용"
                            value={editForm.perDay}
                            onChange={(event) => handleEditChange("perDay")(event.target.value)}
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor={`edit-note-${rule.id}`}>메모</Label>
                          <Input
                            id={`edit-note-${rule.id}`}
                            placeholder="내부 메모 (선택)"
                            value={editForm.note}
                            onChange={(event) => handleEditChange("note")(event.target.value)}
                          />
                        </div>
                        <div className="flex items-center justify-between md:col-span-2">
                          <div className="space-y-1">
                            <Label htmlFor={`edit-active-${rule.id}`}>활성화</Label>
                            <p className="text-muted-foreground text-xs">
                              비활성화하면 해당 규칙은 적용되지 않습니다.
                            </p>
                          </div>
                          <Switch
                            id={`edit-active-${rule.id}`}
                            checked={editForm.isActive}
                            onCheckedChange={(checked) => handleEditChange("isActive")(checked)}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-3">
                        <Button variant="outline" size="sm" onClick={cancelEdit}>
                          <X className="mr-2 h-4 w-4" /> 취소
                        </Button>
                        <Button size="sm" onClick={updateRule}>
                          <Save className="mr-2 h-4 w-4" /> 저장
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
    </div>
  );
}
