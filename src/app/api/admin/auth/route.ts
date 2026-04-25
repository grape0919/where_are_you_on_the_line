import { NextRequest, NextResponse } from "next/server";

import { ADMIN_COOKIE_NAME, createAdminSessionValue } from "@/lib/adminAuth";

type LoginRequestBody = {
  password?: string;
};

/**
 * 쿠키 secure 플래그 결정.
 * - NEXT_PUBLIC_APP_URL이 https://면 true (HTTPS 환경)
 * - http://면 false (HTTP 환경 — secure 쿠키 사용 시 브라우저가 전송 안 함)
 */
function isHttpsApp(): boolean {
  return process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://") ?? false;
}

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function timingSafeEqualString(a: string, b: string): boolean {
  const aBytes = new TextEncoder().encode(a);
  const bBytes = new TextEncoder().encode(b);
  if (aBytes.length !== bBytes.length) return false;
  let diff = 0;
  for (let i = 0; i < aBytes.length; i++) {
    diff |= aBytes[i]! ^ bBytes[i]!;
  }
  return diff === 0;
}

// Rate limit: IP당 10초간 최대 5회 시도
// 실 업무 환경(병원 데스크) 친화적: 짧은 윈도우 자동 복구로 직원 오타에 빠르게 풀림.
// 봇 무차별 시도는 초당 0.5회 수준으로 제한되어 실효 차단.
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 10 * 1000;
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const entry = loginAttempts.get(ip);

  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return { allowed: true };
  }

  if (entry.count >= LOGIN_MAX_ATTEMPTS) {
    return { allowed: false, retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000) };
  }

  entry.count++;
  return { allowed: true };
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateCheck = checkRateLimit(ip);
  if (!rateCheck.allowed) {
    const res = jsonError(
      `로그인 시도 횟수를 초과했습니다. ${rateCheck.retryAfterSeconds}초 후 다시 시도해주세요.`,
      429
    );
    res.headers.set("Retry-After", String(rateCheck.retryAfterSeconds));
    return res;
  }

  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    return jsonError("ADMIN_SECRET is not configured", 500);
  }
  // 프로덕션에서 약한 시크릿 차단 (최소 8자)
  if (process.env.NODE_ENV === "production" && secret.length < 8) {
    console.error("[admin/auth] ADMIN_SECRET은 프로덕션에서 8자 이상이어야 합니다.");
    return jsonError("Server misconfiguration", 500);
  }

  let body: LoginRequestBody = {};
  try {
    body = (await request.json()) as LoginRequestBody;
  } catch {
    body = {};
  }

  const password = (body.password ?? "").toString();
  if (!password) {
    return jsonError("Password is required", 400);
  }

  if (!timingSafeEqualString(password, secret)) {
    return jsonError("Invalid password", 401);
  }

  // 로그인 성공 시 해당 IP의 시도 횟수 초기화
  loginAttempts.delete(ip);

  const value = await createAdminSessionValue(secret);
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value,
    httpOnly: true,
    sameSite: "lax",
    secure: isHttpsApp(),
    path: "/",
    maxAge: 12 * 60 * 60,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: isHttpsApp(),
    path: "/",
    maxAge: 0,
  });
  return response;
}


