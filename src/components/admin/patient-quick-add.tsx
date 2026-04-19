"use client";

import { useMemo, useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, ChevronDown } from "lucide-react";
import type { PatientItem } from "@/types/domain";

interface Props {
  existingPatients: PatientItem[];
  onAdd: (data: {
    name: string;
    phone: string;
    age: number | null;
    notes: string | null;
  }) => Promise<void>;
  isPending: boolean;
}

function normalizePhone(v: string): string {
  return v.replace(/[^0-9]/g, "");
}

export function PatientQuickAdd({ existingPatients, onAdd, isPending }: Props) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [notes, setNotes] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const trimmedName = name.trim();
  const trimmedPhone = phone.trim();
  const parsedAge = age ? parseInt(age, 10) : null;
  const ageValid = parsedAge == null || (parsedAge > 0 && parsedAge < 150);

  const phoneValid = !trimmedPhone || /^01[016789]\d{7,8}$/.test(trimmedPhone);

  const duplicatePhone = useMemo(() => {
    if (!trimmedPhone) return null;
    return existingPatients.find((p) => p.phone === trimmedPhone && p.isActive) ?? null;
  }, [trimmedPhone, existingPatients]);

  const canSubmit =
    trimmedName.length > 0 &&
    trimmedPhone.length > 0 &&
    phoneValid &&
    ageValid &&
    !duplicatePhone &&
    !isPending;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    await onAdd({
      name: trimmedName,
      phone: trimmedPhone,
      age: parsedAge,
      notes: notes.trim() || null,
    });
    setName("");
    setPhone("");
    setAge("");
    setNotes("");
    setShowDetails(false);
    nameInputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="bg-muted/30 space-y-2 rounded-lg border border-dashed p-3">
      <div className="flex flex-wrap items-start gap-2">
        <div className="min-w-[140px] flex-1">
          <Input
            ref={nameInputRef}
            placeholder="환자명 *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={30}
          />
        </div>
        <div className="min-w-[150px] flex-1">
          <Input
            inputMode="tel"
            placeholder="연락처 (01012345678) *"
            value={phone}
            onChange={(e) => setPhone(normalizePhone(e.target.value))}
            onKeyDown={handleKeyDown}
            className={
              duplicatePhone ? "border-destructive" : !phoneValid ? "border-destructive" : ""
            }
            maxLength={11}
          />
        </div>
        <div className="w-20">
          <Input
            type="number"
            min={1}
            max={150}
            placeholder="나이"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            onKeyDown={handleKeyDown}
            className={!ageValid ? "border-destructive" : ""}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowDetails((v) => !v)}
        >
          <ChevronDown
            className={`mr-1 h-4 w-4 transition-transform ${showDetails ? "rotate-180" : ""}`}
          />
          메모
        </Button>
        <Button onClick={handleSubmit} disabled={!canSubmit}>
          <Plus className="mr-2 h-4 w-4" />
          {isPending ? "추가 중..." : "추가"}
        </Button>
      </div>

      {showDetails && (
        <div className="pt-1">
          <Input
            placeholder="메모 (특이사항, 병력 등)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={200}
          />
        </div>
      )}

      {duplicatePhone && (
        <p className="text-destructive pl-1 text-xs">
          동일 번호의 환자가 이미 있습니다: {duplicatePhone.code} {duplicatePhone.name}
        </p>
      )}
      {!duplicatePhone && trimmedPhone && !phoneValid && (
        <p className="text-destructive pl-1 text-xs">
          휴대폰 번호 형식이 올바르지 않습니다 (예: 01012345678).
        </p>
      )}
      {!ageValid && (
        <p className="text-destructive pl-1 text-xs">나이는 1~149 사이여야 합니다.</p>
      )}
      {!duplicatePhone && !trimmedName && (
        <p className="text-muted-foreground pl-1 text-xs">
          환자 접수 시 자동으로 등록됩니다. 수동 추가는 선(pre) 등록용으로만 사용하세요.
        </p>
      )}
    </div>
  );
}
