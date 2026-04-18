"use client";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";

import { formatTimeHM } from "@/lib/time";
import { QUEUE_STATUS_LABELS, QUEUE_STATUS_COLORS } from "@/lib/constants";
import type { QueueItem } from "@/types/queue";

interface CompletedListProps {
  completedQueues: QueueItem[];
  cancelledQueues: QueueItem[];
  onDelete: (token: string) => Promise<void>;
}

export function CompletedList({ completedQueues, cancelledQueues, onDelete }: CompletedListProps) {
  const allItems = [...completedQueues, ...cancelledQueues];
  if (allItems.length === 0) return null;

  return (
    <details className="group">
      <summary className="cursor-pointer list-none">
        <Card>
          <CardHeader className="py-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                완료 / 취소
                <Badge variant="secondary" className="ml-2">
                  {allItems.length}
                </Badge>
              </CardTitle>
              <span className="text-muted-foreground text-sm group-open:hidden">펼치기 ▼</span>
              <span className="text-muted-foreground hidden text-sm group-open:inline">접기 ▲</span>
            </div>
          </CardHeader>
        </Card>
      </summary>
      <div className="mt-2 space-y-3">
        {allItems.map((queue) => (
          <div key={queue.token} className="rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <span className="font-medium">{queue.name}</span>
                  <Badge className={QUEUE_STATUS_COLORS[queue.status]}>
                    {QUEUE_STATUS_LABELS[queue.status]}
                  </Badge>
                  {queue.treatmentItems.map((item) => (
                    <Badge key={item} variant="secondary" className="text-xs">
                      {item}
                    </Badge>
                  ))}
                </div>
                <div className="text-muted-foreground text-sm">
                  접수: {formatTimeHM(queue.createdAt)}
                  {queue.completedAt && <> · 완료: {formatTimeHM(queue.completedAt)}</>}
                  {queue.cancelReason && <> · 사유: {queue.cancelReason}</>}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => onDelete(queue.token)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </details>
  );
}
