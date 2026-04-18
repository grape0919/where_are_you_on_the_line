"use client";

import { useState } from "react";
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
import { Separator } from "@/components/ui/separator";
import { Plus } from "lucide-react";

import { getJSON } from "@/lib/storage";
import { LS_KEYS } from "@/lib/constants";
import type { PatientItem } from "@/types/domain";

interface ServiceOption {
  value: string;
  label: string;
  waitTime: number;
}

interface DoctorOption {
  value: string;
  label: string;
}

interface RegistrationFormProps {
  serviceOptions: ServiceOption[];
  doctorOptions: DoctorOption[];
  onRegister: (data: {
    name: string;
    phone: string;
    selectedItems: string[];
    totalEstimatedMinutes: number;
    doctor?: string;
  }) => Promise<void>;
}

export function RegistrationForm({
  serviceOptions,
  doctorOptions,
  onRegister,
}: RegistrationFormProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PatientItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [regForm, setRegForm] = useState({
    name: "",
    phone: "",
    selectedItems: [] as string[],
    doctor: "",
  });

  const selectedTotalMinutes = regForm.selectedItems.reduce((sum, item) => {
    const svc = serviceOptions.find((s) => s.value === item);
    return sum + (svc?.waitTime || 10);
  }, 0);

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
          (p.name.toLowerCase().includes(q) || p.phone.includes(q) || p.id.toLowerCase().includes(q))
      )
      .slice(0, 5);
    setSearchResults(results);
  };

  const selectPatient = (patient: PatientItem) => {
    setRegForm((prev) => ({ ...prev, name: patient.name, phone: patient.phone }));
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

  const handleSubmit = async () => {
    if (!regForm.name.trim() || !regForm.phone.trim() || regForm.selectedItems.length === 0) {
      alert("이름, 연락처, 진료항목을 모두 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onRegister({
        name: regForm.name.trim(),
        phone: regForm.phone.trim(),
        selectedItems: regForm.selectedItems,
        totalEstimatedMinutes: selectedTotalMinutes,
        doctor: regForm.doctor || undefined,
      });
      setRegForm({ name: "", phone: "", selectedItems: [], doctor: "" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
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
            onClick={handleSubmit}
            disabled={
              isSubmitting ||
              !regForm.name.trim() ||
              !regForm.phone.trim() ||
              regForm.selectedItems.length === 0
            }
            className="w-full md:w-auto"
          >
            <Plus className="mr-2 h-4 w-4" />
            {isSubmitting ? "접수 중..." : "접수"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
