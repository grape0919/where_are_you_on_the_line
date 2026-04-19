"use client";

import { useMemo, useState } from "react";
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

type Filter = "today" | "week" | "all";

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function getEventTime(queue: QueueItem): number {
  // 완료된 경우 completedAt, 취소는 cancelledAt, 없으면 createdAt
  return queue.completedAt ?? queue.cancelledAt ?? queue.createdAt;
}

function formatDateHeader(dayStart: number, todayStart: number): string {
  const diff = Math.floor((todayStart - dayStart) / (24 * 60 * 60 * 1000));
  const d = new Date(dayStart);
  const dateStr = `${d.getMonth() + 1}월 ${d.getDate()}일`;
  const weekday = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
  if (diff === 0) return `오늘 (${dateStr} ${weekday})`;
  if (diff === 1) return `어제 (${dateStr} ${weekday})`;
  return `${dateStr} (${weekday})`;
}

export function CompletedList({ completedQueues, cancelledQueues, onDelete }: CompletedListProps) {
  const [filter, setFilter] = useState<Filter>("today");

  const allItems = useMemo(
    () =>
      [...completedQueues, ...cancelledQueues].sort(
        (a, b) => getEventTime(b) - getEventTime(a)
      ),
    [completedQueues, cancelledQueues]
  );

  const todayStart = startOfDay(Date.now());
  const weekStart = todayStart - 6 * 24 * 60 * 60 * 1000;

  const filtered = useMemo(() => {
    if (filter === "all") return allItems;
    if (filter === "today") return allItems.filter((q) => getEventTime(q) >= todayStart);
    return allItems.filter((q) => getEventTime(q) >= weekStart);
  }, [allItems, filter, todayStart, weekStart]);

  // 날짜별 그룹핑 (yyyy-mm-dd key)
  const grouped = useMemo(() => {
    const map = new Map<number, QueueItem[]>();
    for (const q of filtered) {
      const day = startOfDay(getEventTime(q));
      const arr = map.get(day) ?? [];
      arr.push(q);
      map.set(day, arr);
    }
    return Array.from(map.entries()).sort((a, b) => b[0] - a[0]);
  }, [filtered]);

  if (allItems.length === 0) return null;

  const counts = {
    today: allItems.filter((q) => getEventTime(q) >= todayStart).length,
    week: allItems.filter((q) => getEventTime(q) >= weekStart).length,
    all: allItems.length,
  };

  return (
    <details className="group" open>
      <summary className="cursor-pointer list-none">
        <Card>
          <CardHeader className="py-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                완료 / 취소
                <Badge variant="secondary" className="ml-2">
                  {filtered.length}
                  {filter !== "all" && (
                    <span className="text-muted-foreground ml-1">/ {allItems.length}</span>
                  )}
                </Badge>
              </CardTitle>
              <span className="text-muted-foreground text-sm group-open:hidden">펼치기 ▼</span>
              <span className="text-muted-foreground hidden text-sm group-open:inline">접기 ▲</span>
            </div>
          </CardHeader>
        </Card>
      </summary>

      <div className="mt-2 space-y-3">
        {/* 기간 필터 */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={filter === "today" ? "default" : "outline"}
            onClick={() => setFilter("today")}
          >
            오늘 ({counts.today})
          </Button>
          <Button
            size="sm"
            variant={filter === "week" ? "default" : "outline"}
            onClick={() => setFilter("week")}
          >
            최근 7일 ({counts.week})
          </Button>
          <Button
            size="sm"
            variant={filter === "all" ? "default" : "outline"}
            onClick={() => setFilter("all")}
          >
            전체 ({counts.all})
          </Button>
        </div>

        {filtered.length === 0 ? (
          <div className="text-muted-foreground rounded-lg border p-6 text-center text-sm">
            해당 기간에 완료/취소된 접수가 없습니다.
          </div>
        ) : (
          grouped.map(([dayStart, items]) => (
            <div key={dayStart} className="space-y-2">
              <div className="text-muted-foreground flex items-center gap-2 px-1 pt-2 text-xs font-medium">
                {formatDateHeader(dayStart, todayStart)}
                <span className="bg-muted-foreground/10 rounded px-1.5 py-0.5">
                  {items.length}건
                </span>
              </div>
              {items.map((queue) => (
                <div key={queue.token} className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="mb-1 flex flex-wrap items-center gap-2">
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
                        {queue.cancelledAt && <> · 취소: {formatTimeHM(queue.cancelledAt)}</>}
                        {queue.cancelReason && <> · 사유: {queue.cancelReason}</>}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDelete(queue.token)}
                      title="영구 삭제"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </details>
  );
}
