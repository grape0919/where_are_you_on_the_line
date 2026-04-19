"use client";

import { useMemo, useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { SpecialtyItem } from "@/types/domain";

interface Props {
  existingSpecialties: SpecialtyItem[];
  onAdd: (name: string) => Promise<void>;
  isPending: boolean;
}

export function SpecialtyQuickAdd({ existingSpecialties, onAdd, isPending }: Props) {
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const trimmed = name.trim();
  const duplicate = useMemo(() => {
    if (!trimmed) return null;
    return existingSpecialties.find((s) => s.name === trimmed) ?? null;
  }, [trimmed, existingSpecialties]);

  const canSubmit = trimmed.length > 0 && !duplicate && !isPending;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    await onAdd(trimmed);
    setName("");
    inputRef.current?.focus();
  };

  return (
    <div className="bg-muted/30 space-y-2 rounded-lg border border-dashed p-3">
      <div className="flex flex-wrap items-start gap-2">
        <div className="min-w-[200px] flex-1">
          <Input
            ref={inputRef}
            placeholder="전문과목 이름 (예: 정형외과) *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSubmit();
              }
            }}
            className={duplicate ? "border-destructive" : ""}
            maxLength={30}
          />
        </div>
        <Button onClick={handleSubmit} disabled={!canSubmit}>
          <Plus className="mr-2 h-4 w-4" />
          {isPending ? "추가 중..." : "추가"}
        </Button>
      </div>
      {duplicate && (
        <p className="text-destructive pl-1 text-xs">
          이미 등록된 전문과목입니다{!duplicate.isActive && " (비활성 상태)"}.
        </p>
      )}
      {!duplicate && !trimmed && (
        <p className="text-muted-foreground pl-1 text-xs">
          Enter로 바로 추가됩니다. 이름을 변경하면 해당 전문과목을 사용하는 의사 데이터도 자동 갱신됩니다.
        </p>
      )}
    </div>
  );
}
