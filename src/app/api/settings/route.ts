import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, verifyAdminSessionValue } from "@/lib/adminAuth";
import { getOperatingHours, setOperatingHours, getLastResetDate } from "@/lib/autoReset";
import type { OperatingHoursRule } from "@/types/domain";

async function isAdminAuthorized(request: NextRequest): Promise<boolean> {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;
  const cookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  return verifyAdminSessionValue(cookie, secret);
}

// GET: 운영시간 설정 조회
export async function GET() {
  return NextResponse.json({
    operatingHours: getOperatingHours(),
    lastResetDate: getLastResetDate(),
  });
}

// PUT: 운영시간 설정 저장 (관리자 전용)
export async function PUT(request: NextRequest) {
  if (!(await isAdminAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { operatingHours } = body;

    if (!operatingHours || !Array.isArray(operatingHours)) {
      return NextResponse.json({ error: "operatingHours is required" }, { status: 400 });
    }

    // 검증: 각 항목이 올바른 형식인지
    const validDays = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
    const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
    for (const rule of operatingHours as OperatingHoursRule[]) {
      if (!validDays.includes(rule.dayOfWeek)) {
        return NextResponse.json({ error: `Invalid dayOfWeek: ${rule.dayOfWeek}` }, { status: 400 });
      }
      if (rule.hasLunch) {
        if (!rule.lunchStart || !rule.lunchEnd) {
          return NextResponse.json(
            { error: `${rule.dayOfWeek}: 점심시간이 켜져있으면 시작/종료 시간이 필요합니다.` },
            { status: 400 }
          );
        }
        if (!TIME_PATTERN.test(rule.lunchStart) || !TIME_PATTERN.test(rule.lunchEnd)) {
          return NextResponse.json(
            { error: `${rule.dayOfWeek}: 점심시간 형식 오류 (HH:MM)` },
            { status: 400 }
          );
        }
        if (rule.lunchStart >= rule.lunchEnd) {
          return NextResponse.json(
            { error: `${rule.dayOfWeek}: 점심 시작이 종료보다 늦을 수 없습니다.` },
            { status: 400 }
          );
        }
      }
    }

    await setOperatingHours(operatingHours);

    return NextResponse.json({ ok: true, operatingHours: getOperatingHours() });
  } catch (err) {
    console.error("[settings] 저장 실패:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
