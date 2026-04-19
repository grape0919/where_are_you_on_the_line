"use client";

import { useState, useEffect, useRef } from "react";
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
import { toast } from "sonner";

import type { PatientItem } from "@/types/domain";
import { usePatientSearch } from "@/lib/useMasterData";

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
  const { data: searchResults = [], isFetching } = usePatientSearch(searchQuery);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const [regForm, setRegForm] = useState({
    name: "",
    phone: "",
    selectedItems: [] as string[],
    doctor: "",
  });

  const visibleResults = searchResults.slice(0, 5);

  // 검색어 변경되면 선택 인덱스 초기화
  useEffect(() => {
    setHighlightIndex(0);
  }, [searchQuery]);

  // 바깥 클릭 시 결과 닫기
  useEffect(() => {
    if (!searchFocused) return;
    const handleClick = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [searchFocused]);

  const selectedTotalMinutes = regForm.selectedItems.reduce((sum, item) => {
    const svc = serviceOptions.find((s) => s.value === item);
    return sum + (svc?.waitTime || 10);
  }, 0);

  const selectPatient = (patient: PatientItem) => {
    setRegForm((prev) => ({ ...prev, name: patient.name, phone: patient.phone }));
    setSearchQuery("");
    setSearchFocused(false);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!visibleResults.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => (i + 1) % visibleResults.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => (i - 1 + visibleResults.length) % visibleResults.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const selected = visibleResults[highlightIndex];
      if (selected) selectPatient(selected);
    } else if (e.key === "Escape") {
      setSearchFocused(false);
    }
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
      toast.error("이름, 연락처, 진료항목을 모두 입력해주세요.");
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
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "접수 실패");
    } finally {
      setIsSubmitting(false);
    }
  };

  const showResults = searchFocused && searchQuery.trim().length >= 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          환자 접수
        </CardTitle>
        <CardDescription>
          환자 정보를 입력하고 접수하세요. 접수 시 환자에게 알림이 발송됩니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* 기존 환자 검색 */}
          <div className="relative space-y-2" ref={searchContainerRef}>
            <Label>기존 환자 검색</Label>
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              onFocus={() => setSearchFocused(true)}
              placeholder="이름, 전화번호, 환자코드로 검색 (↑↓ 이동, Enter 선택)"
              aria-autocomplete="list"
              aria-expanded={showResults && visibleResults.length > 0}
            />
            {showResults && visibleResults.length > 0 && (
              <div className="absolute top-full left-0 z-10 mt-1 w-full rounded-md border bg-popover shadow-md">
                {visibleResults.map((p, i) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`flex w-full items-center justify-between px-3 py-2 text-sm ${
                      i === highlightIndex ? "bg-accent" : "hover:bg-accent"
                    }`}
                    onClick={() => selectPatient(p)}
                    onMouseEnter={() => setHighlightIndex(i)}
                  >
                    <span className="font-medium">
                      {p.name}{" "}
                      <span className="text-muted-foreground text-xs">{p.code}</span>
                    </span>
                    <span className="text-muted-foreground">{p.phone}</span>
                  </button>
                ))}
              </div>
            )}
            {showResults && !isFetching && visibleResults.length === 0 && (
              <p className="text-muted-foreground text-xs">
                검색 결과가 없습니다. 아래에 직접 입력해주세요.
              </p>
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
                예상 소요시간:{" "}
                <span className="font-medium text-foreground">{selectedTotalMinutes}분</span>
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
