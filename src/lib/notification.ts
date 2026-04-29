import type { QueueStore } from "@/lib/queueStore";
import { isAligoConfigured, sendAligoSms } from "@/lib/aligoSms";

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

/**
 * 임박 알림을 보낸 것으로 미리 표시.
 * 접수 시점에 ETA가 임계값 이하라 접수 완료 메시지에 임박 안내를 합쳐 발송한 경우,
 * 후속 checkAndNotifyApproaching이 동일 환자에게 중복 발송하지 않도록 사용.
 */
export function markApproachingNotified(token: string): void {
  approachingNotifiedTokens.add(token);
}

// ────────────────────────────────────────────────────────────
// 메시지 템플릿
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

const HOSPITAL_NAME = process.env.NEXT_PUBLIC_HOSPITAL_NAME || "올바른정형외과";

function buildMessage(payload: NotificationPayload): string {
  const waitText = payload.estimatedWaitMinutes
    ? `예상 대기 약 ${payload.estimatedWaitMinutes}분`
    : "";

  switch (payload.type) {
    case "registration": {
      // ETA가 임계값 이하면 임박 안내를 합친 단일 메시지 발송
      const isImmediate =
        payload.estimatedWaitMinutes != null &&
        payload.estimatedWaitMinutes <= APPROACHING_THRESHOLD_MINUTES;

      if (isImmediate) {
        const lines = [
          `[${HOSPITAL_NAME}]`,
          `${payload.name}님 접수 완료 — 곧 호출됩니다.`,
          payload.queuePosition ? `순번: ${payload.queuePosition}번` : null,
          "진료실 근처에서 대기해주세요.",
        ].filter(Boolean);
        return lines.join("\n");
      }

      const lines = [
        `[${HOSPITAL_NAME}]`,
        `${payload.name}님 접수 완료`,
        payload.queuePosition ? `순번: ${payload.queuePosition}번` : null,
        waitText || null,
        payload.queueUrl ? `대기현황: ${payload.queueUrl}` : null,
      ].filter(Boolean);
      return lines.join("\n");
    }
    case "approaching": {
      const lines = [
        `[${HOSPITAL_NAME}]`,
        `${payload.name}님 곧 호출됩니다.`,
        "진료실 근처에서 대기해주세요.",
      ];
      return lines.join("\n");
    }
    case "in_progress": {
      return `[${HOSPITAL_NAME}]\n${payload.name}님 진료를 시작합니다.`;
    }
    default:
      return `[${HOSPITAL_NAME}] ${payload.name}님`;
  }
}

// ────────────────────────────────────────────────────────────
// 알림 발송 (알리고 SMS)
// ────────────────────────────────────────────────────────────

const TYPE_LABEL: Record<NotificationType, string> = {
  registration: "접수 완료",
  approaching: "호출 임박",
  in_progress: "진료 시작",
};

/**
 * 알림 발송. 알리고 환경변수가 설정되면 실제 SMS 발송,
 * 아니면 콘솔 로그만 남김 (개발 환경).
 */
export async function sendNotification(payload: NotificationPayload): Promise<void> {
  const msg = buildMessage(payload);

  if (!isAligoConfigured()) {
    console.log(
      `[Notification/dev] ${TYPE_LABEL[payload.type]} → ${payload.name} (${payload.phone})\n${msg}`
    );
    return;
  }

  try {
    const res = await sendAligoSms({ receiver: payload.phone, msg });
    console.log(
      `[Notification/aligo] ${TYPE_LABEL[payload.type]} → ${payload.name} (${payload.phone}) ` +
        `type=${res.msg_type} msg_id=${res.msg_id}`
    );
  } catch (err) {
    console.error(
      `[Notification/aligo] ${TYPE_LABEL[payload.type]} 발송 실패 → ${payload.phone}:`,
      err instanceof Error ? err.message : err
    );
    throw err;
  }
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
