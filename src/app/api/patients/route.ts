import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthorized, unauthorized } from "@/lib/apiAuth";

const PATIENT_CODE_PREFIX = "P";
const PATIENT_CODE_PAD = 4;

function formatPatientCode(sequence: number): string {
  return `${PATIENT_CODE_PREFIX}${sequence.toString().padStart(PATIENT_CODE_PAD, "0")}`;
}

/**
 * GET:
 *   - ?q=검색어: 이름/전화/코드로 검색 (관리자)
 *   - 기본: 전체 목록
 */
export async function GET(request: NextRequest) {
  if (!(await isAdminAuthorized(request))) return unauthorized();

  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim();
    const activeOnly = searchParams.get("activeOnly") !== "false";

    const where: Record<string, unknown> = {};
    if (activeOnly) where.isActive = true;
    if (q) {
      (where as { OR: unknown[] }).OR = [
        { name: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
        { code: { contains: q.toUpperCase() } },
      ];
    }

    const patients = await prisma.patient.findMany({
      where,
      orderBy: { id: "desc" },
      take: q ? 10 : 200,
    });
    return NextResponse.json({ patients });
  } catch (err) {
    console.error("[patients GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthorized(request))) return unauthorized();

  try {
    const body = await request.json();
    const { name, phone, age, notes, isActive } = body;
    if (!name || !phone) {
      return NextResponse.json({ error: "name, phone이 필요합니다." }, { status: 400 });
    }

    // 다음 코드 번호 계산
    const last = await prisma.patient.findFirst({ orderBy: { id: "desc" } });
    const nextSeq = (last?.id ?? 0) + 1;
    const code = formatPatientCode(nextSeq);

    const created = await prisma.patient.create({
      data: {
        code,
        name: String(name).trim(),
        phone: String(phone).trim(),
        age: typeof age === "number" && age > 0 ? age : null,
        notes: notes ? String(notes) : null,
        isActive: isActive !== false,
      },
    });
    return NextResponse.json(created);
  } catch (err) {
    console.error("[patients POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  if (!(await isAdminAuthorized(request))) return unauthorized();

  try {
    const body = await request.json();
    const { id, name, phone, age, notes, isActive, lastVisit } = body;
    if (typeof id !== "number") {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (name != null) data.name = String(name).trim();
    if (phone != null) data.phone = String(phone).trim();
    if (age !== undefined) data.age = typeof age === "number" && age > 0 ? age : null;
    if (notes !== undefined) data.notes = notes ? String(notes) : null;
    if (typeof isActive === "boolean") data.isActive = isActive;
    if (lastVisit !== undefined) data.lastVisit = lastVisit ? new Date(lastVisit) : null;

    const updated = await prisma.patient.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (err) {
    console.error("[patients PUT]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!(await isAdminAuthorized(request))) return unauthorized();

  try {
    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get("id");
    const id = idParam ? parseInt(idParam, 10) : NaN;
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    await prisma.patient.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[patients DELETE]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
