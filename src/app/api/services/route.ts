import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthorized, unauthorized } from "@/lib/apiAuth";

// GET: 진료항목 목록 (공개 — 환자 페이지에서도 참조 가능)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("activeOnly") !== "false";
    const services = await prisma.service.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { id: "asc" },
    });
    return NextResponse.json({ services });
  } catch (err) {
    console.error("[services GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: 진료항목 생성 (관리자 전용)
export async function POST(request: NextRequest) {
  if (!(await isAdminAuthorized(request))) return unauthorized();

  try {
    const body = await request.json();
    const { value, label, waitTime, isActive } = body;

    if (!value || !label || typeof waitTime !== "number" || waitTime < 0) {
      return NextResponse.json(
        { error: "value, label, waitTime(>=0)이 필요합니다." },
        { status: 400 }
      );
    }

    const created = await prisma.service.create({
      data: {
        value: String(value).trim(),
        label: String(label).trim(),
        waitTime: Math.floor(waitTime),
        isActive: isActive !== false,
      },
    });
    return NextResponse.json(created);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    if (message.includes("Unique constraint")) {
      return NextResponse.json({ error: "같은 value의 진료항목이 이미 존재합니다." }, { status: 409 });
    }
    console.error("[services POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT: 진료항목 수정
export async function PUT(request: NextRequest) {
  if (!(await isAdminAuthorized(request))) return unauthorized();

  try {
    const body = await request.json();
    const { id, value, label, waitTime, isActive, autoUpdate } = body;
    if (typeof id !== "number") {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (value != null) data.value = String(value).trim();
    if (label != null) data.label = String(label).trim();
    if (typeof waitTime === "number" && waitTime >= 0) data.waitTime = Math.floor(waitTime);
    if (typeof isActive === "boolean") data.isActive = isActive;
    if (typeof autoUpdate === "boolean") data.autoUpdate = autoUpdate;

    const updated = await prisma.service.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (err) {
    console.error("[services PUT]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE: 소프트 삭제 (isActive=false)
export async function DELETE(request: NextRequest) {
  if (!(await isAdminAuthorized(request))) return unauthorized();

  try {
    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get("id");
    const id = idParam ? parseInt(idParam, 10) : NaN;
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    await prisma.service.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[services DELETE]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
