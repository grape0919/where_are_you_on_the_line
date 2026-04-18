import type { QueueData, QueueStatus } from "@/types/queue";

export const VALID_STATUS_TRANSITIONS: Record<QueueStatus, QueueStatus[]> = {
  confirmed: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export interface QueueStore {
  // 읽기 — 인메모리 캐시에서 동기 반환
  get(token: string): QueueData | undefined;
  list(): QueueData[];
  listByStatus(status: QueueStatus): QueueData[];

  // 쓰기 — DB 영속화 포함 async
  set(item: QueueData): Promise<void>;
  update(token: string, patch: Partial<QueueData>): Promise<QueueData | undefined>;
  delete(token: string): Promise<boolean>;
  clear(): Promise<void>;
}

export class InMemoryQueueStore implements QueueStore {
  private store = new Map<string, QueueData>();

  get(token: string) {
    return this.store.get(token);
  }

  list() {
    return Array.from(this.store.values());
  }

  listByStatus(status: QueueStatus) {
    return Array.from(this.store.values()).filter((item) => item.status === status);
  }

  async set(item: QueueData): Promise<void> {
    this.store.set(item.token, item);
  }

  async update(token: string, patch: Partial<QueueData>): Promise<QueueData | undefined> {
    const curr = this.store.get(token);
    if (!curr) return undefined;
    const updated = { ...curr, ...patch, updatedAt: Date.now() } as QueueData;
    this.store.set(token, updated);
    return updated;
  }

  async delete(token: string): Promise<boolean> {
    return this.store.delete(token);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }
}

// 활성 대기열 (confirmed + in_progress) 을 접수 순서로 정렬
export function getActiveQueue(store: QueueStore): QueueData[] {
  return store
    .list()
    .filter((item) => item.status === "confirmed" || item.status === "in_progress")
    .sort((a, b) => a.createdAt - b.createdAt);
}

// 담당의별 활성 대기열 (같은 담당의 환자만 필터)
function getActiveQueueByDoctor(store: QueueStore, doctor?: string): QueueData[] {
  return getActiveQueue(store).filter((item) => (item.doctor || "") === (doctor || ""));
}

// in_progress 환자의 남은 진료시간 계산
function getRemainingMinutes(item: QueueData, now: number): number {
  if (item.status === "in_progress" && item.inProgressAt) {
    const elapsed = Math.floor((now - item.inProgressAt) / (1000 * 60));
    return Math.max(0, item.totalEstimatedMinutes - elapsed);
  }
  return item.totalEstimatedMinutes;
}

// 특정 환자의 대기 메트릭 계산 (담당의별 큐)
export function computeQueueMetrics(
  token: string,
  store: QueueStore,
  now = Date.now()
): { queuePosition: number; patientsAhead: number; estimatedWaitTime: number } {
  const item = store.get(token);
  if (!item) {
    return { queuePosition: 0, patientsAhead: 0, estimatedWaitTime: 0 };
  }

  const doctorQueue = getActiveQueueByDoctor(store, item.doctor);
  const index = doctorQueue.findIndex((q) => q.token === token);

  if (index < 0) {
    return { queuePosition: 0, patientsAhead: 0, estimatedWaitTime: 0 };
  }

  const ahead = doctorQueue.slice(0, index);
  const waitTime = ahead.reduce((sum, q) => sum + getRemainingMinutes(q, now), 0);

  return {
    queuePosition: index + 1,
    patientsAhead: ahead.length,
    estimatedWaitTime: waitTime,
  };
}

// 모든 활성 환자의 메트릭 일괄 재계산 (담당의별)
export async function recalculateAllMetrics(store: QueueStore, now = Date.now()): Promise<void> {
  const activeQueue = getActiveQueue(store);

  // 담당의별로 그룹핑
  const byDoctor = new Map<string, QueueData[]>();
  for (const item of activeQueue) {
    const key = item.doctor || "";
    const group = byDoctor.get(key) ?? [];
    group.push(item);
    byDoctor.set(key, group);
  }

  // 각 담당의 그룹 내에서 순서·대기시간 계산 — 병렬 DB 업데이트
  const updates: Promise<unknown>[] = [];
  for (const group of byDoctor.values()) {
    let cumulativeWait = 0;
    for (let i = 0; i < group.length; i++) {
      const item = group[i]!;
      updates.push(
        store.update(item.token, {
          queuePosition: i + 1,
          patientsAhead: i,
          estimatedWaitTime: cumulativeWait,
        })
      );
      cumulativeWait += getRemainingMinutes(item, now);
    }
  }
  await Promise.all(updates);
}
