import { NextRequest, NextResponse } from "next/server";
import type { QueueData, QueueStatus } from "@/types/queue";
import { SERVICE_WAIT_TIMES } from "@/lib/constants";

import {
  InMemoryQueueStore,
  RedisQueueStore,
  VALID_STATUS_TRANSITIONS,
  computeQueueMetrics,
  recalculateAllMetrics,
} from "@/lib/queueStore";
import { isRedisEnabled } from "@/lib/env";
import { ADMIN_COOKIE_NAME, verifyAdminSessionValue } from "@/lib/adminAuth";

const store = isRedisEnabled() ? new RedisQueueStore() : new InMemoryQueueStore();

async function isAdminAuthorized(request: NextRequest): Promise<boolean> {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;
  const cookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  return verifyAdminSessionValue(cookie, secret);
}

function unauthorized(): NextResponse {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function canTransition(from: QueueStatus, to: QueueStatus): boolean {
  return VALID_STATUS_TRANSITIONS[from].includes(to);
}

// 토큰 생성 (crypto 기반)
function generateToken(): string {
  const uuid = crypto.randomUUID().replace(/-/g, "").substring(0, 12);
  return `Q-${uuid}`.toUpperCase();
}

// 진료항목별 소요시간 조회
function getTreatmentDuration(items: string[]): number {
  return items.reduce((sum, item) => sum + (SERVICE_WAIT_TIMES[item] || 10), 0);
}

// GET: 환자 대기열 조회 (인증 불필요 — 토큰이 접근 증명)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    const queueItem = store.get(token);
    if (!queueItem) {
      return NextResponse.json({ error: "Queue not found" }, { status: 404 });
    }

    // 실시간 메트릭 계산
    const now = Date.now();
    const metrics = computeQueueMetrics(token, store, now);

    return NextResponse.json({
      ...queueItem,
      queuePosition: metrics.queuePosition,
      patientsAhead: metrics.patientsAhead,
      eta: metrics.estimatedWaitTime,
      updatedAt: now,
    });
  } catch (error) {
    console.error("Queue API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: 직원이 환자 접수 (관리자 전용)
export async function POST(request: NextRequest) {
  try {
    if (!(await isAdminAuthorized(request))) {
      return unauthorized();
    }

    const body = await request.json();
    const { name, phone, treatmentItems, doctor, room } = body;

    // 입력 검증
    if (!name || !phone || !treatmentItems || !Array.isArray(treatmentItems) || treatmentItems.length === 0) {
      return NextResponse.json(
        { error: "이름, 연락처, 진료항목을 모두 입력해주세요." },
        { status: 400 }
      );
    }
    if (typeof name !== "string" || name.trim().length === 0 || name.length > 50) {
      return NextResponse.json({ error: "Invalid name" }, { status: 400 });
    }
    if (typeof phone !== "string" || phone.length > 20) {
      return NextResponse.json({ error: "Invalid phone" }, { status: 400 });
    }

    const token = generateToken();
    const now = Date.now();
    const totalEstimatedMinutes = getTreatmentDuration(treatmentItems);

    const queueItem: QueueData = {
      token,
      name: name.trim(),
      phone,
      treatmentItems,
      totalEstimatedMinutes,
      doctor,
      room,
      status: "confirmed",
      estimatedWaitTime: 0, // 아래에서 재계산
      queuePosition: 0,
      patientsAhead: 0,
      createdAt: now,
      updatedAt: now,
      confirmedAt: now,
    };

    store.set(queueItem);

    // 전체 대기열 메트릭 재계산
    recalculateAllMetrics(store, now);

    // 재계산된 데이터 다시 조회
    const updated = store.get(token)!;
    const queueUrl = `/queue?token=${encodeURIComponent(token)}`;

    // TODO: Phase 2 — 카카오/SMS 알림 발송 트리거
    // await sendNotification({ phone, type: "registration", queueUrl, ... });

    return NextResponse.json({
      ...updated,
      queueUrl,
    });
  } catch (error) {
    console.error("Queue creation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT: 대기열 정보 수정 (관리자용)
export async function PUT(request: NextRequest) {
  try {
    if (!(await isAdminAuthorized(request))) {
      return unauthorized();
    }

    const body = await request.json();
    const { token, name, phone, treatmentItems, doctor, room } = body;

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    const queueItem = store.get(token);
    if (!queueItem) {
      return NextResponse.json({ error: "Queue not found" }, { status: 404 });
    }

    const patch: Partial<QueueData> = {};
    if (name != null) patch.name = name;
    if (phone != null) patch.phone = phone;
    if (doctor != null) patch.doctor = doctor;
    if (room != null) patch.room = room;
    if (treatmentItems != null && Array.isArray(treatmentItems)) {
      patch.treatmentItems = treatmentItems;
      patch.totalEstimatedMinutes = getTreatmentDuration(treatmentItems);
    }

    const updatedItem = store.update(token, patch);
    recalculateAllMetrics(store);

    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error("Queue update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE: 대기열 삭제 (관리자용)
export async function DELETE(request: NextRequest) {
  try {
    if (!(await isAdminAuthorized(request))) {
      return unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    const deleted = store.delete(token);
    if (!deleted) {
      return NextResponse.json({ error: "Queue not found" }, { status: 404 });
    }

    recalculateAllMetrics(store);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Queue deletion error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH: 대기열 목록 조회 + 상태 전이 액션 (관리자용)
export async function PATCH(request: NextRequest) {
  try {
    if (!(await isAdminAuthorized(request))) {
      return unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    if (action === "list") {
      // 목록 반환 전 메트릭 재계산
      recalculateAllMetrics(store);

      const queues = store.list().map((item) => ({
        ...item,
        elapsedMinutes: Math.floor((Date.now() - item.createdAt) / (1000 * 60)),
      }));

      return NextResponse.json({
        queues: queues.sort((a, b) => a.createdAt - b.createdAt),
        total: queues.length,
      });
    }

    // 상태 전이 액션: startTreatment, complete, adminCancel
    if (action === "startTreatment" || action === "complete" || action === "adminCancel") {
      const body = await request.json();
      const { token, cancelReason } = body;

      if (!token) {
        return NextResponse.json({ error: "Token is required" }, { status: 400 });
      }

      const queueItem = store.get(token);
      if (!queueItem) {
        return NextResponse.json({ error: "Queue not found" }, { status: 404 });
      }

      const targetStatus: QueueStatus =
        action === "startTreatment"
          ? "in_progress"
          : action === "complete"
            ? "completed"
            : "cancelled";

      if (!canTransition(queueItem.status, targetStatus)) {
        return NextResponse.json(
          { error: `Cannot transition from '${queueItem.status}' to '${targetStatus}'` },
          { status: 400 }
        );
      }

      // 같은 담당의에 이미 진료중인 환자가 있으면 차단
      if (action === "startTreatment") {
        const doctorKey = queueItem.doctor || "";
        const alreadyInProgress = store
          .listByStatus("in_progress")
          .some((q) => (q.doctor || "") === doctorKey && q.token !== token);
        if (alreadyInProgress) {
          return NextResponse.json(
            { error: "해당 담당의에 이미 진료 중인 환자가 있습니다." },
            { status: 400 }
          );
        }
      }

      const now = Date.now();
      const patch: Partial<QueueData> = { status: targetStatus };

      if (action === "startTreatment") {
        patch.inProgressAt = now;
      } else if (action === "complete") {
        patch.completedAt = now;
      } else {
        patch.cancelledAt = now;
        patch.cancelReason =
          typeof cancelReason === "string"
            ? cancelReason.trim().slice(0, 500) || undefined
            : undefined;
      }

      const updated = store.update(token, patch);
      recalculateAllMetrics(store, now);

      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Queue PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
