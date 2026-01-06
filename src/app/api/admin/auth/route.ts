import { NextRequest, NextResponse } from "next/server";

import { ADMIN_COOKIE_NAME, createAdminSessionValue } from "@/lib/adminAuth";

type LoginRequestBody = {
  password?: string;
};

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

export async function POST(request: NextRequest) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    return jsonError("ADMIN_SECRET is not configured", 500);
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

  const value = await createAdminSessionValue(secret);
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
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
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}


