"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const PRESET_REASONS = [
  "환자 요청",
  "호출 미응답",
  "중복 접수",
  "진료 불가 (증상 상이)",
  "의사 부재",
  "기타",
];

interface Props {
  open: boolean;
  patientName: string;
  onClose: () => void;
  onConfirm: (reason: string | undefined) => void;
}

export function CancelReasonDialog({ open, patientName, onClose, onConfirm }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [customReason, setCustomReason] = useState("");

  useEffect(() => {
    if (open) {
      setSelected(null);
      setCustomReason("");
    }
  }, [open]);

  const finalReason =
    selected === "기타"
      ? customReason.trim() || undefined
      : selected ?? undefined;

  const canSubmit = selected != null && (selected !== "기타" || customReason.trim().length > 0);

  const handleSubmit = () => {
    onConfirm(finalReason);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>접수 취소</DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">{patientName}</span>님의 접수를
            취소합니다. 취소 사유를 선택해주세요.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="flex flex-wrap gap-2">
            {PRESET_REASONS.map((reason) => (
              <Button
                key={reason}
                type="button"
                size="sm"
                variant={selected === reason ? "default" : "outline"}
                onClick={() => setSelected(reason)}
              >
                {reason}
              </Button>
            ))}
          </div>

          {selected === "기타" && (
            <div className="space-y-2">
              <Label htmlFor="custom-reason">상세 사유 *</Label>
              <Input
                id="custom-reason"
                autoFocus
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="사유를 입력해주세요"
                maxLength={200}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            돌아가기
          </Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={!canSubmit}>
            취소 확정
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
