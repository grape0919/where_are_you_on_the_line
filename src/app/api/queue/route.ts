import { NextRequest, NextResponse } from "next/server";
import type { QueueData, QueueStatus } from "@/types/queue";

import {
  VALID_STATUS_TRANSITIONS,
  computeQueueMetrics,
  recalculateAllMetrics,
} from "@/lib/queueStore";
import { ADMIN_COOKIE_NAME, verifyAdminSessionValue } from "@/lib/adminAuth";
import { startAutoResetScheduler, loadOperatingHoursFromDb } from "@/lib/autoReset";
import {
  APPROACHING_THRESHOLD_MINUTES,
  checkAndNotifyApproaching,
  clearApproachingNotification,
  clearAllApproachingNotifications,
  markApproachingNotified,
  sendNotification,
} from "@/lib/notification";
import { PostgresQueueStore } from "@/lib/postgresQueueStore";

const store = new PostgresQueueStore();

// 서버 시작 시 초기화: DB에서 캐시 로드 + 운영시간 로드
let initError: Error | null = null;

const ready = (async () => {
  try {
    await store.loadFromDb();
    await loadOperatingHoursFromDb();
    startAutoResetScheduler(store);
  } catch (err) {
    initError = err instanceof Error ? err : new Error(String(err));
    console.error("[API] Server initialization failed:", err);
  }
})();

async function ensureReady(): Promise<void> {
  await ready;
  if (initError) throw initError;
}

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

// 소요시간 유효성 검증 (0 이하이거나 비정상이면 기본값)
function validateDuration(minutes: unknown): number | null {
  if (typeof minutes === "number" && minutes > 0 && minutes <= 1440) return minutes;
  return null;
}

/**
 * 접수 시 환자 마스터 upsert. 환자 id 반환.
 * - 같은 phone이 있으면 name/lastVisit 갱신
 * - 없으면 새로 생성 (code 자동 부여: P0001, P0002, ...)
 */
async function upsertPatient(name: string, phone: string): Promise<number> {
  const { prisma } = await import("@/lib/prisma");
  const now = new Date();

  const existing = await prisma.patient.findFirst({
    where: { phone, isActive: true },
    orderBy: { id: "desc" },
  });

  if (existing) {
    await prisma.patient.update({
      where: { id: existing.id },
      data: { name, lastVisit: now },
    });
    return existing.id;
  }

  const last = await prisma.patient.findFirst({ orderBy: { id: "desc" } });
  const nextSeq = (last?.id ?? 0) + 1;
  const code = `P${nextSeq.toString().padStart(4, "0")}`;

  const created = await prisma.patient.create({
    data: { code, name, phone, lastVisit: now, isActive: true },
  });
  return created.id;
}

// GET: 환자 대기열 조회 (인증 불필요 — 토큰이 접근 증명)
export async function GET(request: NextRequest) {
  try {
    await ensureReady();
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
    await ensureReady();
    if (!(await isAdminAuthorized(request))) {
      return unauthorized();
    }

    const body = await request.json();
    const { name, phone, treatmentItems, totalEstimatedMinutes: clientMinutes, doctor, room } = body;

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
    // 관리자 UI에서 계산한 소요시간 사용 (관리자 설정 진료항목 waitTime 기반)
    const totalEstimatedMinutes = validateDuration(clientMinutes) ?? treatmentItems.length * 10;

    // 환자 마스터 upsert 먼저 — 접수 기록과 연결할 patientId 확보
    const patientId = await upsertPatient(name.trim(), phone).catch((err) => {
      console.error("[queue POST] 환자 upsert 실패:", err);
      return null;
    });

    const queueItem: QueueData = {
      token,
      patientId,
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

    await store.set(queueItem);

    // 전체 대기열 메트릭 재계산
    await recalculateAllMetrics(store, now);

    // 재계산된 데이터 다시 조회
    const updated = store.get(token)!;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    const queueUrl = `/queue?token=${encodeURIComponent(token)}`;

    // 접수 시점에 이미 임박 상태(ETA ≤ 임계값)면 메시지 통합 발송 (SMS 1통).
    // checkAndNotifyApproaching의 중복 발송을 막기 위해 미리 토큰 등록.
    const isImmediate = updated.estimatedWaitTime <= APPROACHING_THRESHOLD_MINUTES;
    if (isImmediate) {
      markApproachingNotified(token);
    }

    // 접수 완료 알림 발송 (알리고 SMS, 실패해도 접수 자체는 성공)
    sendNotification({
      phone,
      name: name.trim(),
      type: "registration",
      queuePosition: updated.queuePosition,
      estimatedWaitMinutes: updated.estimatedWaitTime,
      queueUrl: appUrl ? `${appUrl}${queueUrl}` : queueUrl,
    }).catch((err) => console.error("[Notification] 접수 알림 발송 오류:", err));

    // 임박 알림 대상 체크 (방금 접수한 환자는 위에서 등록되어 skip됨)
    checkAndNotifyApproaching(store, appUrl);

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
    await ensureReady();
    if (!(await isAdminAuthorized(request))) {
      return unauthorized();
    }

    const body = await request.json();
    const { token, name, phone, treatmentItems, totalEstimatedMinutes: clientMinutes, doctor, room } = body;

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
      // 클라이언트가 보낸 소요시간 사용, 없으면 기존값 유지
      const validated = validateDuration(clientMinutes);
      if (validated) patch.totalEstimatedMinutes = validated;
    }

    const updatedItem = await store.update(token, patch);
    await recalculateAllMetrics(store);

    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error("Queue update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE: 대기열 삭제 (관리자용)
export async function DELETE(request: NextRequest) {
  try {
    await ensureReady();
    if (!(await isAdminAuthorized(request))) {
      return unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    const deleted = await store.delete(token);
    if (!deleted) {
      return NextResponse.json({ error: "Queue not found" }, { status: 404 });
    }

    await recalculateAllMetrics(store);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Queue deletion error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH: 대기열 목록 조회 + 상태 전이 액션 (관리자용)
export async function PATCH(request: NextRequest) {
  try {
    await ensureReady();
    if (!(await isAdminAuthorized(request))) {
      return unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    if (action === "list") {
      // 목록 반환 전 메트릭 재계산
      await recalculateAllMetrics(store);

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

      const updated = await store.update(token, patch);
      await recalculateAllMetrics(store, now);

      // 완료/취소 시 임박 알림 이력 제거
      if (action === "complete" || action === "adminCancel") {
        clearApproachingNotification(token);
      }

      // 대기 중 환자 임박 알림 체크
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
      checkAndNotifyApproaching(store, appUrl);

      return NextResponse.json(updated);
    }

    // 대기열 전체 초기화
    if (action === "reset") {
      const count = store.list().length;
      await store.clear();
      clearAllApproachingNotifications();
      return NextResponse.json({ success: true, cleared: count });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Queue PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
