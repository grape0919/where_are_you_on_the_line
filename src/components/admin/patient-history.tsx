"use client";

import { Badge } from "@/components/ui/badge";
import { RefreshCw, Clock } from "lucide-react";
import { usePatientHistory } from "@/lib/useMasterData";
import { QUEUE_STATUS_LABELS, QUEUE_STATUS_COLORS } from "@/lib/constants";

interface Props {
  patientId: number;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PatientHistory({ patientId }: Props) {
  const { data, isLoading, error } = usePatientHistory(patientId);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
        <RefreshCw className="h-3 w-3 animate-spin" />
        이력 불러오는 중...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="px-4 py-3 text-sm text-destructive">이력을 불러올 수 없습니다.</div>
    );
  }

  const { history } = data;

  if (history.length === 0) {
    return (
      <div className="px-4 py-3 text-sm text-muted-foreground">
        접수 이력이 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-2 px-4 pt-2 pb-4">
      <div className="text-muted-foreground text-xs font-medium">
        접수 이력 ({history.length}건)
      </div>
      <div className="space-y-2">
        {history.map((h) => (
          <div key={h.id} className="rounded-md border bg-muted/30 p-3 text-sm">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{formatDate(h.createdAt)}</span>
              <Badge className={`text-xs ${QUEUE_STATUS_COLORS[h.status]}`}>
                {QUEUE_STATUS_LABELS[h.status]}
              </Badge>
              {h.doctor && (
                <Badge variant="outline" className="text-xs">
                  {h.doctor}
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-1">
              {h.treatmentItems.map((item) => (
                <Badge key={item} variant="secondary" className="text-xs">
                  {item}
                </Badge>
              ))}
            </div>
            {h.cancelReason && (
              <div className="mt-2 text-xs text-muted-foreground">
                취소 사유: {h.cancelReason}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
