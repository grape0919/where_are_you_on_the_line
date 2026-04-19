"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, ChevronDown } from "lucide-react";
import type { ServiceItem } from "@/types/domain";

// 정형외과 흔한 진료항목 프리셋
const PRESETS: Array<{ label: string; waitTime: number }> = [
  { label: "일반진료", waitTime: 10 },
  { label: "도수치료", waitTime: 30 },
  { label: "체외충격파", waitTime: 20 },
  { label: "물리치료", waitTime: 20 },
  { label: "주사치료", waitTime: 15 },
  { label: "초음파치료", waitTime: 15 },
  { label: "운동치료", waitTime: 25 },
  { label: "재진", waitTime: 5 },
  { label: "X-ray", waitTime: 10 },
];

interface Props {
  existingServices: ServiceItem[];
  onAdd: (data: { value: string; label: string; waitTime: number }) => Promise<void>;
  isPending: boolean;
}

export function ServiceQuickAdd({ existingServices, onAdd, isPending }: Props) {
  const [label, setLabel] = useState("");
  const [waitTime, setWaitTime] = useState("");
  const [showPresets, setShowPresets] = useState(false);
  const labelInputRef = useRef<HTMLInputElement>(null);
  const presetsRef = useRef<HTMLDivElement>(null);

  // 바깥 클릭 시 프리셋 닫기
  useEffect(() => {
    if (!showPresets) return;
    const handleClick = (e: MouseEvent) => {
      if (presetsRef.current && !presetsRef.current.contains(e.target as Node)) {
        setShowPresets(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showPresets]);

  const trimmedLabel = label.trim();
  const parsedWaitTime = parseInt(waitTime, 10);
  const isWaitTimeValid = Number.isFinite(parsedWaitTime) && parsedWaitTime > 0 && parsedWaitTime <= 1440;

  // 이미 존재하는 항목인지 (label 또는 value 기준)
  const duplicate = useMemo(() => {
    if (!trimmedLabel) return null;
    return (
      existingServices.find(
        (s) => s.label === trimmedLabel || s.value === trimmedLabel
      ) ?? null
    );
  }, [trimmedLabel, existingServices]);

  const canSubmit = trimmedLabel.length > 0 && isWaitTimeValid && !duplicate && !isPending;

  // 프리셋 중 아직 등록 안된 것만 노출
  const availablePresets = PRESETS.filter(
    (p) => !existingServices.some((s) => s.label === p.label || s.value === p.label)
  );

  const handleSubmit = async () => {
    if (!canSubmit) return;
    await onAdd({
      value: trimmedLabel,
      label: trimmedLabel,
      waitTime: parsedWaitTime,
    });
    setLabel("");
    setWaitTime("");
    labelInputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  const applyPreset = (preset: (typeof PRESETS)[number]) => {
    setLabel(preset.label);
    setWaitTime(preset.waitTime.toString());
    setShowPresets(false);
    labelInputRef.current?.focus();
  };

  return (
    <div className="bg-muted/30 space-y-2 rounded-lg border border-dashed p-3">
      <div className="flex flex-wrap items-start gap-2">
        <div className="min-w-[180px] flex-1">
          <Input
            ref={labelInputRef}
            placeholder="항목명 (예: 도수치료) *"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={handleKeyDown}
            className={duplicate ? "border-destructive" : ""}
            maxLength={50}
          />
        </div>
        <div className="w-32">
          <Input
            type="number"
            min={1}
            max={1440}
            placeholder="분 *"
            value={waitTime}
            onChange={(e) => setWaitTime(e.target.value)}
            onKeyDown={handleKeyDown}
            className={waitTime && !isWaitTimeValid ? "border-destructive" : ""}
          />
        </div>

        <div className="relative" ref={presetsRef}>
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowPresets((v) => !v)}
            disabled={availablePresets.length === 0}
          >
            <ChevronDown className="mr-1 h-4 w-4" />
            프리셋
          </Button>
          {showPresets && availablePresets.length > 0 && (
            <div className="absolute top-full right-0 z-10 mt-1 w-56 rounded-md border bg-popover shadow-md">
              <div className="text-muted-foreground border-b px-3 py-2 text-xs">
                정형외과 추천 항목
              </div>
              {availablePresets.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  className="hover:bg-accent flex w-full items-center justify-between px-3 py-2 text-sm"
                  onClick={() => applyPreset(preset)}
                >
                  <span>{preset.label}</span>
                  <span className="text-muted-foreground text-xs">{preset.waitTime}분</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <Button onClick={handleSubmit} disabled={!canSubmit}>
          <Plus className="mr-2 h-4 w-4" />
          {isPending ? "추가 중..." : "추가"}
        </Button>
      </div>

      {/* 에러/안내 메시지 */}
      {duplicate && (
        <p className="text-destructive pl-1 text-xs">
          이미 등록된 항목입니다: {duplicate.label} (현재 {duplicate.waitTime}분
          {!duplicate.isActive && ", 비활성 상태"})
        </p>
      )}
      {!duplicate && waitTime && !isWaitTimeValid && (
        <p className="text-destructive pl-1 text-xs">
          대기시간은 1~1440분 사이여야 합니다.
        </p>
      )}
      {!duplicate && !waitTime && !label && (
        <p className="text-muted-foreground pl-1 text-xs">
          항목명과 대기시간을 입력하거나 프리셋을 선택하세요. Enter로 바로 추가됩니다.
        </p>
      )}
    </div>
  );
}
