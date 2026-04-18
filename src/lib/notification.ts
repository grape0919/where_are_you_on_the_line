import type { QueueData } from "@/types/queue";
import type { QueueStore } from "@/lib/queueStore";

// 호출 임박 알림 기준 (분)
export const APPROACHING_THRESHOLD_MINUTES = 10;

// 임박 알림을 이미 보낸 토큰 추적 (메모리 기반, 서버 재시작 시 초기화)
const approachingNotifiedTokens = new Set<string>();

// 알림 이력 초기화 (환자 완료/취소 시 호출)
export function clearApproachingNotification(token: string): void {
  approachingNotifiedTokens.delete(token);
}

// 대기열 초기화 시 전체 알림 이력 초기화
export function clearAllApproachingNotifications(): void {
  approachingNotifiedTokens.clear();
}

// ────────────────────────────────────────────────────────────
// 실제 알림 발송 함수 (Phase 2에서 채널 연동)
// ────────────────────────────────────────────────────────────

export type NotificationType = "registration" | "approaching" | "in_progress";

export interface NotificationPayload {
  phone: string;
  name: string;
  type: NotificationType;
  queuePosition?: number;
  estimatedWaitMinutes?: number;
  queueUrl?: string;
}

/**
 * 알림 발송 인터페이스 (플레이스홀더)
 * Phase 2에서 카카오 알림톡 또는 SMS API로 교체 예정.
 */
export async function sendNotification(payload: NotificationPayload): Promise<void> {
  const label: Record<NotificationType, string> = {
    registration: "접수 완료",
    approaching: "호출 임박",
    in_progress: "진료 시작",
  };

  console.log(
    `[Notification] ${label[payload.type]} — ${payload.name} (${payload.phone})` +
      (payload.estimatedWaitMinutes != null ? `, 예상 대기 ${payload.estimatedWaitMinutes}분` : "") +
      (payload.queueUrl ? `, URL: ${payload.queueUrl}` : "")
  );

  // TODO: Phase 2 — 카카오 알림톡 또는 SMS 발송
  // 채널 미정: 아래 구현 중 하나를 선택
  //
  // [Option A] 카카오 알림톡
  // await kakaoAlimtalk.send({
  //   to: payload.phone,
  //   templateCode: TEMPLATE_CODES[payload.type],
  //   args: { name: payload.name, waitMinutes: payload.estimatedWaitMinutes, url: payload.queueUrl },
  // });
  //
  // [Option B] SMS (twilio / coolsms)
  // await smsClient.messages.create({
  //   to: payload.phone,
  //   body: buildSmsBody(payload),
  // });
}

// ────────────────────────────────────────────────────────────
// 호출 임박 자동 감지 (recalculateAllMetrics 이후 호출)
// ────────────────────────────────────────────────────────────

/**
 * 전체 대기 중(confirmed) 환자 중 예상 대기시간이 임계값 이하인 환자에게
 * 중복 없이 임박 알림을 발송합니다.
 */
export function checkAndNotifyApproaching(store: QueueStore, baseUrl = ""): void {
  const confirmed = store.listByStatus("confirmed");

  for (const patient of confirmed) {
    if (
      patient.estimatedWaitTime <= APPROACHING_THRESHOLD_MINUTES &&
      !approachingNotifiedTokens.has(patient.token)
    ) {
      approachingNotifiedTokens.add(patient.token);

      const queueUrl = baseUrl ? `${baseUrl}/queue?token=${encodeURIComponent(patient.token)}` : "";

      sendNotification({
        phone: patient.phone,
        name: patient.name,
        type: "approaching",
        queuePosition: patient.queuePosition,
        estimatedWaitMinutes: patient.estimatedWaitTime,
        queueUrl,
      }).catch((err) => console.error("[Notification] 임박 알림 발송 오류:", err));
    }
  }
}
