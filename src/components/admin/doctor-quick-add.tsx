"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, ChevronDown } from "lucide-react";
import type { DoctorItem } from "@/types/domain";
import { useSpecialties } from "@/lib/useMasterData";

interface Props {
  existingDoctors: DoctorItem[];
  onAdd: (data: {
    name: string;
    specialty: string;
    room: string;
    phone: string | null;
    email: string | null;
  }) => Promise<void>;
  isPending: boolean;
}

export function DoctorQuickAdd({ existingDoctors, onAdd, isPending }: Props) {
  const { data: specialties = [] } = useSpecialties(true);
  const [name, setName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [room, setRoom] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [showSpecialties, setShowSpecialties] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const specialtiesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showSpecialties) return;
    const handleClick = (e: MouseEvent) => {
      if (specialtiesRef.current && !specialtiesRef.current.contains(e.target as Node)) {
        setShowSpecialties(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showSpecialties]);

  const trimmedName = name.trim();
  const trimmedSpecialty = specialty.trim();
  const trimmedRoom = room.trim();

  const duplicateName = useMemo(() => {
    if (!trimmedName) return null;
    return existingDoctors.find((d) => d.name === trimmedName) ?? null;
  }, [trimmedName, existingDoctors]);

  const duplicateRoom = useMemo(() => {
    if (!trimmedRoom) return null;
    return existingDoctors.find((d) => d.room === trimmedRoom && d.isActive) ?? null;
  }, [trimmedRoom, existingDoctors]);

  const emailValid = !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const canSubmit =
    trimmedName.length > 0 &&
    trimmedSpecialty.length > 0 &&
    trimmedRoom.length > 0 &&
    !duplicateName &&
    emailValid &&
    !isPending;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    await onAdd({
      name: trimmedName,
      specialty: trimmedSpecialty,
      room: trimmedRoom,
      phone: phone.trim() || null,
      email: email.trim() || null,
    });
    setName("");
    setSpecialty("");
    setRoom("");
    setPhone("");
    setEmail("");
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
            placeholder="의사명 *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            className={duplicateName ? "border-destructive" : ""}
            maxLength={20}
          />
        </div>

        <div className="relative min-w-[140px] flex-1" ref={specialtiesRef}>
          <Input
            placeholder="진료과목 *"
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            onFocus={() => setShowSpecialties(true)}
            onKeyDown={handleKeyDown}
            maxLength={30}
          />
          {showSpecialties && specialties.length > 0 && (
            <div className="absolute top-full left-0 z-10 mt-1 w-full rounded-md border bg-popover shadow-md">
              <div className="text-muted-foreground border-b px-3 py-2 text-xs">
                전문과목 선택 (관리자 페이지에서 추가/수정 가능)
              </div>
              {specialties.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="hover:bg-accent w-full px-3 py-2 text-left text-sm"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setSpecialty(s.name);
                    setShowSpecialties(false);
                  }}
                >
                  {s.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="w-24">
          <Input
            placeholder="진료실 *"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            onKeyDown={handleKeyDown}
            className={duplicateRoom ? "border-orange-400" : ""}
            maxLength={10}
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
          {showDetails ? "간략히" : "더보기"}
        </Button>

        <Button onClick={handleSubmit} disabled={!canSubmit}>
          <Plus className="mr-2 h-4 w-4" />
          {isPending ? "추가 중..." : "추가"}
        </Button>
      </div>

      {showDetails && (
        <div className="flex flex-wrap items-start gap-2 pt-1">
          <div className="min-w-[140px] flex-1">
            <Input
              placeholder="연락처 (선택)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={20}
            />
          </div>
          <div className="min-w-[180px] flex-1">
            <Input
              placeholder="이메일 (선택)"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
              className={!emailValid ? "border-destructive" : ""}
            />
          </div>
        </div>
      )}

      {/* 에러/안내 메시지 */}
      {duplicateName && (
        <p className="text-destructive pl-1 text-xs">
          이미 등록된 의사명입니다: {duplicateName.name} ({duplicateName.specialty},{" "}
          {duplicateName.room}호
          {!duplicateName.isActive && ", 비활성"})
        </p>
      )}
      {!duplicateName && duplicateRoom && (
        <p className="pl-1 text-xs text-orange-600">
          진료실 {duplicateRoom.room}호는 이미 {duplicateRoom.name} 선생님이 사용 중입니다.
        </p>
      )}
      {!emailValid && <p className="text-destructive pl-1 text-xs">이메일 형식이 올바르지 않습니다.</p>}
      {!duplicateName && !duplicateRoom && emailValid && !trimmedName && (
        <p className="text-muted-foreground pl-1 text-xs">
          의사명·진료과목·진료실은 필수입니다. 연락처/이메일은 &quot;더보기&quot;에서 추가 입력.
        </p>
      )}
    </div>
  );
}
