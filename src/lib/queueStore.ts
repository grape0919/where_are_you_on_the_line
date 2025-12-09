import type { QueueData } from "@/types/queue";

export interface QueueStore {
  get(token: string): QueueData | undefined;
  set(item: QueueData): void;
  update(token: string, patch: Partial<QueueData>): QueueData | undefined;
  delete(token: string): boolean;
  list(): QueueData[];
}

export class InMemoryQueueStore implements QueueStore {
  private store = new Map<string, QueueData>();
  get(token: string) {
    return this.store.get(token);
  }
  set(item: QueueData) {
    this.store.set(item.token, item);
  }
  update(token: string, patch: Partial<QueueData>) {
    const curr = this.store.get(token);
    if (!curr) return undefined;
    const updated = { ...curr, ...patch, updatedAt: Date.now() } as QueueData;
    this.store.set(token, updated);
    return updated;
  }
  delete(token: string) {
    return this.store.delete(token);
  }
  list() {
    return Array.from(this.store.values());
  }
}

// Placeholder for future Redis integration. For now, mirrors in-memory behavior.
export class RedisQueueStore extends InMemoryQueueStore {}

export function computeRemainingWait(createdAt: number, estimatedWaitTime: number, now = Date.now()) {
  const elapsedMinutes = Math.floor((now - createdAt) / (1000 * 60));
  return Math.max(0, estimatedWaitTime - elapsedMinutes);
}

