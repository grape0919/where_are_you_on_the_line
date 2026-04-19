import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthorized, unauthorized } from "@/lib/apiAuth";

// GET: 전문과목 목록 (공개 — 접수 폼 등에서 참조)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("activeOnly") !== "false";
    const specialties = await prisma.specialty.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { id: "asc" },
    });
    return NextResponse.json({ specialties });
  } catch (err) {
    console.error("[specialties GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: 생성
export async function POST(request: NextRequest) {
  if (!(await isAdminAuthorized(request))) return unauthorized();

  try {
    const body = await request.json();
    const { name, isActive } = body;
    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "name이 필요합니다." }, { status: 400 });
    }

    const created = await prisma.specialty.create({
      data: {
        name: name.trim(),
        isActive: isActive !== false,
      },
    });
    return NextResponse.json(created);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    if (message.includes("Unique constraint")) {
      return NextResponse.json({ error: "같은 이름의 전문과목이 이미 존재합니다." }, { status: 409 });
    }
    console.error("[specialties POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PUT: 수정.
 * 이름이 바뀌면 Doctor.specialty 도 모두 cascade 업데이트 (기존 의사 데이터 호환).
 */
export async function PUT(request: NextRequest) {
  if (!(await isAdminAuthorized(request))) return unauthorized();

  try {
    const body = await request.json();
    const { id, name, isActive } = body;
    if (typeof id !== "number") {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const current = await prisma.specialty.findUnique({ where: { id } });
    if (!current) {
      return NextResponse.json({ error: "Specialty not found" }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    const nextName = typeof name === "string" ? name.trim() : null;
    if (nextName && nextName !== current.name) data.name = nextName;
    if (typeof isActive === "boolean") data.isActive = isActive;

    // 트랜잭션: specialty 수정 + 이름 변경이면 doctor.specialty 일괄 업데이트
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.specialty.update({ where: { id }, data });
      if (nextName && nextName !== current.name) {
        await tx.doctor.updateMany({
          where: { specialty: current.name },
          data: { specialty: nextName },
        });
      }
      return result;
    });

    return NextResponse.json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    if (message.includes("Unique constraint")) {
      return NextResponse.json({ error: "같은 이름의 전문과목이 이미 존재합니다." }, { status: 409 });
    }
    console.error("[specialties PUT]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE: 소프트 삭제 (isActive=false).
 * 활성 의사가 사용 중이면 경고 (force=true 쿼리로 강제 가능).
 */
export async function DELETE(request: NextRequest) {
  if (!(await isAdminAuthorized(request))) return unauthorized();

  try {
    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get("id");
    const force = searchParams.get("force") === "true";
    const id = idParam ? parseInt(idParam, 10) : NaN;
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const specialty = await prisma.specialty.findUnique({ where: { id } });
    if (!specialty) {
      return NextResponse.json({ error: "Specialty not found" }, { status: 404 });
    }

    const inUseCount = await prisma.doctor.count({
      where: { specialty: specialty.name, isActive: true },
    });

    if (inUseCount > 0 && !force) {
      return NextResponse.json(
        {
          error: `활성 의사 ${inUseCount}명이 '${specialty.name}' 전문과목을 사용 중입니다.`,
          inUseCount,
        },
        { status: 409 }
      );
    }

    await prisma.specialty.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json({ success: true, inUseCount });
  } catch (err) {
    console.error("[specialties DELETE]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
