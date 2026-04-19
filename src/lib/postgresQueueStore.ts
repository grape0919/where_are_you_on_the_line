import { prisma } from "@/lib/prisma";
import type { QueueData, QueueStatus } from "@/types/queue";
import type { QueueStore } from "@/lib/queueStore";
import type { Queue } from "@/generated/prisma/client";

function rowToQueueData(row: Queue): QueueData {
  return {
    token: row.token,
    patientId: row.patientId ?? null,
    name: row.name,
    phone: row.phone,
    treatmentItems: row.treatmentItems,
    totalEstimatedMinutes: row.totalEstimatedMinutes,
    doctor: row.doctor ?? undefined,
    room: row.room ?? undefined,
    status: row.status as QueueStatus,
    estimatedWaitTime: row.estimatedWaitTime,
    queuePosition: row.queuePosition,
    patientsAhead: row.patientsAhead,
    confirmedAt: row.confirmedAt ? Number(row.confirmedAt) : undefined,
    inProgressAt: row.inProgressAt ? Number(row.inProgressAt) : undefined,
    completedAt: row.completedAt ? Number(row.completedAt) : undefined,
    cancelledAt: row.cancelledAt ? Number(row.cancelledAt) : undefined,
    cancelReason: row.cancelReason ?? undefined,
    createdAt: Number(row.createdAt),
    updatedAt: Number(row.updatedAt),
  };
}

function queueDataToCreateInput(item: QueueData) {
  return {
    token: item.token,
    patientId: item.patientId ?? null,
    name: item.name,
    phone: item.phone,
    treatmentItems: item.treatmentItems,
    totalEstimatedMinutes: item.totalEstimatedMinutes,
    doctor: item.doctor ?? null,
    room: item.room ?? null,
    status: item.status,
    estimatedWaitTime: item.estimatedWaitTime,
    queuePosition: item.queuePosition,
    patientsAhead: item.patientsAhead,
    confirmedAt: item.confirmedAt ? BigInt(item.confirmedAt) : null,
    inProgressAt: item.inProgressAt ? BigInt(item.inProgressAt) : null,
    completedAt: item.completedAt ? BigInt(item.completedAt) : null,
    cancelledAt: item.cancelledAt ? BigInt(item.cancelledAt) : null,
    cancelReason: item.cancelReason ?? null,
    createdAt: BigInt(item.createdAt),
    updatedAt: BigInt(item.updatedAt),
  };
}

function patchToUpdateInput(patch: Partial<QueueData>, now: number): Record<string, unknown> {
  const data: Record<string, unknown> = { updatedAt: BigInt(now) };
  if (patch.patientId !== undefined) data.patientId = patch.patientId ?? null;
  if (patch.name != null) data.name = patch.name;
  if (patch.phone != null) data.phone = patch.phone;
  if (patch.doctor !== undefined) data.doctor = patch.doctor ?? null;
  if (patch.room !== undefined) data.room = patch.room ?? null;
  if (patch.treatmentItems != null) data.treatmentItems = patch.treatmentItems;
  if (patch.totalEstimatedMinutes != null)
    data.totalEstimatedMinutes = patch.totalEstimatedMinutes;
  if (patch.status != null) data.status = patch.status;
  if (patch.estimatedWaitTime != null) data.estimatedWaitTime = patch.estimatedWaitTime;
  if (patch.queuePosition != null) data.queuePosition = patch.queuePosition;
  if (patch.patientsAhead != null) data.patientsAhead = patch.patientsAhead;
  if (patch.confirmedAt !== undefined)
    data.confirmedAt = patch.confirmedAt ? BigInt(patch.confirmedAt) : null;
  if (patch.inProgressAt !== undefined)
    data.inProgressAt = patch.inProgressAt ? BigInt(patch.inProgressAt) : null;
  if (patch.completedAt !== undefined)
    data.completedAt = patch.completedAt ? BigInt(patch.completedAt) : null;
  if (patch.cancelledAt !== undefined)
    data.cancelledAt = patch.cancelledAt ? BigInt(patch.cancelledAt) : null;
  if (patch.cancelReason !== undefined) data.cancelReason = patch.cancelReason ?? null;
  return data;
}

/**
 * PostgreSQL 기반 QueueStore.
 *
 * **쓰기 순서**: DB 먼저 → 성공 시 메모리 캐시 업데이트.
 * 이렇게 하면 DB 실패 시 캐시가 손상되지 않아 (DB ⊇ Cache) 일관성이 보장된다.
 */
export class PostgresQueueStore implements QueueStore {
  private cache = new Map<string, QueueData>();
  private initialized = false;

  // ─ 읽기 ───────────────────────────────────────────────────
  get(token: string): QueueData | undefined {
    return this.cache.get(token);
  }

  list(): QueueData[] {
    return Array.from(this.cache.values());
  }

  listByStatus(status: QueueStatus): QueueData[] {
    return Array.from(this.cache.values()).filter((item) => item.status === status);
  }

  // ─ 쓰기 (DB-first) ────────────────────────────────────────
  async set(item: QueueData): Promise<void> {
    await prisma.queue.create({ data: queueDataToCreateInput(item) });
    this.cache.set(item.token, item);
  }

  async update(token: string, patch: Partial<QueueData>): Promise<QueueData | undefined> {
    const curr = this.cache.get(token);
    if (!curr) return undefined;

    const now = Date.now();
    await prisma.queue.update({
      where: { token },
      data: patchToUpdateInput(patch, now),
    });

    const updated = { ...curr, ...patch, updatedAt: now } as QueueData;
    this.cache.set(token, updated);
    return updated;
  }

  async delete(token: string): Promise<boolean> {
    if (!this.cache.has(token)) return false;
    await prisma.queue.delete({ where: { token } });
    return this.cache.delete(token);
  }

  async clear(): Promise<void> {
    await prisma.queue.deleteMany();
    this.cache.clear();
  }

  // ─ 초기화 ──────────────────────────────────────────────────
  /** 서버 시작 시 DB에서 캐시 로드 (route 모듈 초기화 시 호출) */
  async loadFromDb(): Promise<void> {
    if (this.initialized) return;
    const rows = await prisma.queue.findMany();
    this.cache.clear();
    for (const row of rows) {
      this.cache.set(row.token, rowToQueueData(row));
    }
    this.initialized = true;
    console.log(`[PostgresQueueStore] ${this.cache.size}건 로드 완료`);
  }
}
