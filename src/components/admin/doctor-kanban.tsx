"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  RefreshCw,
  CheckCircle,
  XCircle,
  PlayCircle,
  Stethoscope,
  ExternalLink,
} from "lucide-react";

import { formatMinutesCompact } from "@/lib/time";
import { QUEUE_STATUS_LABELS, QUEUE_STATUS_COLORS } from "@/lib/constants";
import type { QueueItem } from "@/types/queue";

interface DoctorKanbanProps {
  activeQueues: QueueItem[];
  refreshing: boolean;
  onRefresh: () => void;
  onStatusAction: (
    action: "startTreatment" | "complete" | "adminCancel",
    token: string,
    cancelReason?: string
  ) => Promise<void>;
}

function maskPhone(phone: string): string {
  if (phone.length <= 4) return phone;
  return phone.slice(0, 3) + "****" + phone.slice(-4);
}

export function DoctorKanban({
  activeQueues,
  refreshing,
  onRefresh,
  onStatusAction,
}: DoctorKanbanProps) {
  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">
            대기열 현황
            {activeQueues.length > 0 && (
              <Badge className="ml-2 bg-primary/10 text-primary">{activeQueues.length}</Badge>
            )}
          </h2>
          <p className="text-muted-foreground text-sm">담당의별 환자 현황</p>
        </div>
        <Button onClick={onRefresh} variant="outline" disabled={refreshing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "새로고침 중..." : "새로고침"}
        </Button>
      </div>

      {activeQueues.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Users className="text-muted-foreground mx-auto mb-3 h-10 w-10" />
            <p className="text-muted-foreground">현재 대기 중인 환자가 없습니다.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {(() => {
            const grouped = new Map<string, QueueItem[]>();
            for (const q of activeQueues) {
              const key = q.doctor || "미지정";
              const list = grouped.get(key) ?? [];
              list.push(q);
              grouped.set(key, list);
            }

            return Array.from(grouped.entries()).map(([doctorName, doctorQueues]) => {
              const hasInProgress = doctorQueues.some((q) => q.status === "in_progress");
              return (
                <Card key={doctorName} className="flex flex-col">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Stethoscope className="h-4 w-4" />
                        {doctorName}
                      </CardTitle>
                      <Badge variant="secondary">{doctorQueues.length}명</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 space-y-2">
                    {doctorQueues
                      .sort((a, b) => a.queuePosition - b.queuePosition)
                      .map((queue) => (
                        <div
                          key={queue.token}
                          className={`rounded-lg border p-3 ${
                            queue.status === "in_progress"
                              ? "border-orange-300 bg-orange-50"
                              : ""
                          }`}
                        >
                          <div className="mb-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                                {queue.queuePosition}
                              </span>
                              <span className="font-medium">{queue.name}</span>
                              <Badge className={`text-xs ${QUEUE_STATUS_COLORS[queue.status]}`}>
                                {QUEUE_STATUS_LABELS[queue.status]}
                              </Badge>
                            </div>
                          </div>
                          <div className="mb-2 flex flex-wrap gap-1">
                            {queue.treatmentItems.map((item) => (
                              <Badge key={item} variant="secondary" className="text-xs">
                                {item}
                              </Badge>
                            ))}
                          </div>
                          <div className="text-muted-foreground mb-2 text-xs">
                            {maskPhone(queue.phone)} · 소요 {queue.totalEstimatedMinutes}분
                            {queue.status === "confirmed" && queue.estimatedWaitTime > 0 && (
                              <> · 대기 {formatMinutesCompact(queue.estimatedWaitTime)}</>
                            )}
                          </div>
                          <div className="flex gap-1">
                            {queue.status === "confirmed" && (
                              <Button
                                size="sm"
                                className="h-7 bg-orange-500 px-2 text-xs hover:bg-orange-600"
                                disabled={hasInProgress}
                                onClick={() => onStatusAction("startTreatment", queue.token)}
                              >
                                <PlayCircle className="mr-1 h-3 w-3" />
                                진료시작
                              </Button>
                            )}
                            {queue.status === "in_progress" && (
                              <Button
                                size="sm"
                                className="h-7 bg-green-600 px-2 text-xs hover:bg-green-700"
                                onClick={() => {
                                  if (confirm("진료를 완료 처리하시겠습니까?")) {
                                    onStatusAction("complete", queue.token);
                                  }
                                }}
                              >
                                <CheckCircle className="mr-1 h-3 w-3" />
                                진료완료
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2"
                              onClick={() =>
                                window.open(
                                  `/queue?token=${encodeURIComponent(queue.token)}`,
                                  "_blank"
                                )
                              }
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2"
                              onClick={() => {
                                if (confirm("이 접수를 취소하시겠습니까?")) {
                                  onStatusAction("adminCancel", queue.token);
                                }
                              }}
                            >
                              <XCircle className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                  </CardContent>
                </Card>
              );
            });
          })()}
        </div>
      )}
    </>
  );
}
