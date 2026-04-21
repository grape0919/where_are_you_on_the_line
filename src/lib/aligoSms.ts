/**
 * 알리고 SMS API 클라이언트.
 *
 * 공식 문서: https://smartsms.aligo.in/admin/api/info.html
 * 엔드포인트: https://apis.aligo.in/send/
 *
 * SMS (단문): 본문 90바이트(한글 45자) 이하
 * LMS (장문): 2000바이트(한글 1000자) 이하 — 알리고가 msg 길이 보고 자동 분기
 */

export interface AligoSendPayload {
  receiver: string; // 수신번호 (01012345678 형식)
  msg: string; // 본문
  title?: string; // LMS 제목 (선택)
}

export interface AligoResponse {
  result_code: number; // 1=성공, 0 이하는 실패
  message: string;
  msg_id?: number;
  success_cnt?: number;
  error_cnt?: number;
  msg_type?: "SMS" | "LMS" | "MMS";
}

export function isAligoConfigured(): boolean {
  return Boolean(
    process.env.ALIGO_API_KEY && process.env.ALIGO_USER_ID && process.env.ALIGO_SENDER
  );
}

function normalizePhone(phone: string): string {
  // 알리고는 "-" 제거된 숫자만 허용
  return phone.replace(/[^0-9]/g, "");
}

/**
 * 알리고 SMS 발송.
 * 환경변수 미설정 시 throw — 호출자가 isAligoConfigured()로 사전 확인.
 *
 * ALIGO_TESTMODE=Y 면 실제 발송 없이 테스트 응답만 받음 (요금 청구 X).
 */
const ALIGO_TIMEOUT_MS = 10_000;

export async function sendAligoSms(payload: AligoSendPayload): Promise<AligoResponse> {
  const apiKey = process.env.ALIGO_API_KEY;
  const userId = process.env.ALIGO_USER_ID;
  const sender = process.env.ALIGO_SENDER;
  const testMode = process.env.ALIGO_TESTMODE === "Y" ? "Y" : "N";

  if (!apiKey || !userId || !sender) {
    throw new Error("Aligo is not configured (ALIGO_API_KEY, ALIGO_USER_ID, ALIGO_SENDER required)");
  }
  if (!payload.msg || !payload.msg.trim()) {
    throw new Error("Aligo msg is empty");
  }
  if (!payload.receiver) {
    throw new Error("Aligo receiver is empty");
  }

  const form = new URLSearchParams();
  form.append("key", apiKey);
  form.append("user_id", userId);
  form.append("sender", normalizePhone(sender));
  form.append("receiver", normalizePhone(payload.receiver));
  form.append("msg", payload.msg);
  if (payload.title) form.append("title", payload.title);
  form.append("testmode_yn", testMode);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ALIGO_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch("https://apis.aligo.in/send/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`Aligo request timeout (${ALIGO_TIMEOUT_MS}ms)`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    throw new Error(`Aligo HTTP ${res.status}`);
  }

  const data = (await res.json()) as AligoResponse;
  if (data.result_code !== 1) {
    throw new Error(`Aligo API error: ${data.message}`);
  }
  return data;
}
