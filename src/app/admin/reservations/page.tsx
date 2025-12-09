"use client";

import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Collapse } from "@/components/ui/collapse";
import { RefreshCw, Trash2, Calendar as CalendarIcon, ClipboardList, Edit, Save, X } from "lucide-react";
import { useDeleteReservation, useReservations, useUpdateReservation } from "@/lib/useReservation";
import { ensureDefaultReservations, ensureDefaultServices, getActiveServices } from "@/lib/storage";
import { RESERVATION_TIME_SLOTS } from "@/lib/constants";
import type { ReservationData } from "@/types/domain";

export default function ReservationsAdminPage() {
  const { data: reservations = [], refetch, isLoading } = useReservations();
  const del = useDeleteReservation();
  const updateReservation = useUpdateReservation();
  const [dateFilter, setDateFilter] = useState<string>("");
  const [serviceOptions, setServiceOptions] = useState<{ value: string; label: string }[]>([]);
  const [editingReservation, setEditingReservation] = useState<ReservationData | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    patientId: "",
    phone: "",
    service: "",
    date: "",
    timeSlot: "",
    estimatedWaitTime: "",
  });

  useEffect(() => {
    ensureDefaultReservations();
    ensureDefaultServices();
    const activeServices = getActiveServices().map((service) => ({
      value: service.value,
      label: service.label,
    }));
    setServiceOptions(activeServices);
    refetch();
  }, [refetch]);

  const onDelete = async (id: string) => {
    if (!confirm("정말로 이 예약을 삭제하시겠습니까?")) return;
    await del.mutateAsync(id);
    await refetch();
  };

  const ensureServiceOption = (value: string, label: string) => {
    if (!value) return;
    setServiceOptions((prev) => {
      if (prev.some((option) => option.value === value)) return prev;
      return [...prev, { value, label }];
    });
  };

  const startEdit = (reservation: ReservationData) => {
    ensureServiceOption(reservation.service, reservation.service);
    setEditingReservation(reservation);
    setFormData({
      name: reservation.name,
      patientId: reservation.patientId,
      phone: reservation.phone,
      service: reservation.service,
      date: reservation.date,
      timeSlot: reservation.timeSlot,
      estimatedWaitTime: String(reservation.estimatedWaitTime),
    });
  };

  const cancelEdit = () => {
    setEditingReservation(null);
    setFormData({
      name: "",
      patientId: "",
      phone: "",
      service: "",
      date: "",
      timeSlot: "",
      estimatedWaitTime: "",
    });
  };

  const handleInputChange = (key: keyof typeof formData) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({ ...prev, [key]: event.target.value }));
    };

  const handleSelectChange = (key: keyof typeof formData) => (value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const onUpdate = async () => {
    if (!editingReservation) return;
    if (!formData.name.trim() || !formData.patientId.trim() || !formData.phone.trim()) {
      alert("이름, 환자 ID, 연락처를 모두 입력해주세요.");
      return;
    }
    if (!formData.service || !formData.date || !formData.timeSlot) {
      alert("서비스, 날짜, 시간대를 선택해주세요.");
      return;
    }

    const estimated = Number(formData.estimatedWaitTime);
    if (!Number.isFinite(estimated) || estimated <= 0) {
      alert("예상 대기시간은 1 이상의 숫자여야 합니다.");
      return;
    }

    try {
      await updateReservation.mutateAsync({
        reservationId: editingReservation.reservationId,
        updates: {
          name: formData.name.trim(),
          patientId: formData.patientId.trim(),
          phone: formData.phone.trim(),
          service: formData.service,
          date: formData.date,
          timeSlot: formData.timeSlot,
          estimatedWaitTime: estimated,
        },
      });
      await refetch();
      cancelEdit();
    } catch (error) {
      console.error("예약 수정 실패:", error);
      alert("예약 수정 중 오류가 발생했습니다. 다시 시도해주세요.");
    }
  };

  const filtered = useMemo(() => {
    if (!dateFilter) return reservations;
    return reservations.filter((r) => r.date === dateFilter);
  }, [reservations, dateFilter]);

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle>예약 목록</CardTitle>
            <CardDescription>등록된 예약을 확인하고 수정하거나 삭제할 수 있습니다.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-auto"
              aria-label="날짜 필터"
            />
            {dateFilter && (
              <Button variant="ghost" size="sm" onClick={() => setDateFilter("")}>필터 초기화</Button>
            )}
            <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} /> 새로고침
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="py-8 text-center">
              <ClipboardList className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
              <p className="text-muted-foreground">조건에 맞는 예약이 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((r) => (
                <div key={r.reservationId} className="rounded-lg border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <div className="font-medium">{r.name}</div>
                        <Badge variant="outline">{r.patientId}</Badge>
                        <Badge variant="secondary">{r.phone}</Badge>
                      </div>
                      <div className="text-muted-foreground flex items-center gap-2 text-sm">
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="h-4 w-4" /> {r.date}
                        </span>
                        <span>• {r.timeSlot}</span>
                        <span className="text-xs text-muted-foreground">예약번호 {r.reservationId}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{r.service}</Badge>
                      <Badge variant="outline">예상 {r.estimatedWaitTime}분</Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startEdit(r)}
                        aria-label="예약 수정"
                      >
                        <Edit className="mr-1 h-4 w-4" /> 수정
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onDelete(r.reservationId)}
                        aria-label="예약 삭제"
                      >
                        <Trash2 className="mr-1 h-4 w-4" /> 삭제
                      </Button>
                    </div>
                  </div>
                  <Collapse open={editingReservation?.reservationId === r.reservationId} className="bg-white">
                    <div className="space-y-4 px-4 pt-2 pb-4">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                          <Label htmlFor={`name-${r.reservationId}`}>이름 *</Label>
                          <Input
                            id={`name-${r.reservationId}`}
                            value={formData.name}
                            onChange={handleInputChange("name")}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`patient-${r.reservationId}`}>환자 ID *</Label>
                          <Input
                            id={`patient-${r.reservationId}`}
                            value={formData.patientId}
                            onChange={handleInputChange("patientId")}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`phone-${r.reservationId}`}>연락처 *</Label>
                          <Input
                            id={`phone-${r.reservationId}`}
                            value={formData.phone}
                            onChange={handleInputChange("phone")}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                          <Label>진료 항목 *</Label>
                          <Select
                            value={formData.service}
                            onValueChange={handleSelectChange("service")}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="진료 항목을 선택하세요" />
                            </SelectTrigger>
                            <SelectContent>
                              {serviceOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`date-${r.reservationId}`}>예약 날짜 *</Label>
                          <Input
                            id={`date-${r.reservationId}`}
                            type="date"
                            value={formData.date}
                            onChange={handleInputChange("date")}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>예약 시간 *</Label>
                          <Select
                            value={formData.timeSlot}
                            onValueChange={handleSelectChange("timeSlot")}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="예약 시간을 선택하세요" />
                            </SelectTrigger>
                            <SelectContent>
                              {RESERVATION_TIME_SLOTS.map((slot) => (
                                <SelectItem key={slot.value} value={slot.value}>
                                  {slot.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2 md:w-1/3">
                        <Label htmlFor={`eta-${r.reservationId}`}>예상 대기시간 (분) *</Label>
                        <Input
                          id={`eta-${r.reservationId}`}
                          type="number"
                          min={1}
                          value={formData.estimatedWaitTime}
                          onChange={handleInputChange("estimatedWaitTime")}
                        />
                      </div>
                      <div className="flex justify-end gap-3 pt-2">
                        <Button onClick={cancelEdit} variant="outline" size="sm">
                          <X className="mr-2 h-4 w-4" /> 취소
                        </Button>
                        <Button
                          onClick={onUpdate}
                          size="sm"
                          disabled={updateReservation.isPending}
                        >
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
