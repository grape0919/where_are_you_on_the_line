import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthorized, unauthorized } from "@/lib/apiAuth";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("activeOnly") !== "false";
    const doctors = await prisma.doctor.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { id: "asc" },
    });
    return NextResponse.json({ doctors });
  } catch (err) {
    console.error("[doctors GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthorized(request))) return unauthorized();

  try {
    const body = await request.json();
    const { name, specialty, room, phone, email, isActive } = body;
    if (!name || !specialty || !room) {
      return NextResponse.json({ error: "name, specialty, room이 필요합니다." }, { status: 400 });
    }

    const created = await prisma.doctor.create({
      data: {
        name: String(name).trim(),
        specialty: String(specialty).trim(),
        room: String(room).trim(),
        phone: phone ? String(phone).trim() : null,
        email: email ? String(email).trim() : null,
        isActive: isActive !== false,
      },
    });
    return NextResponse.json(created);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    if (message.includes("Unique constraint")) {
      return NextResponse.json({ error: "같은 이름의 의사가 이미 존재합니다." }, { status: 409 });
    }
    console.error("[doctors POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  if (!(await isAdminAuthorized(request))) return unauthorized();

  try {
    const body = await request.json();
    const { id, name, specialty, room, phone, email, isActive } = body;
    if (typeof id !== "number") {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (name != null) data.name = String(name).trim();
    if (specialty != null) data.specialty = String(specialty).trim();
    if (room != null) data.room = String(room).trim();
    if (phone !== undefined) data.phone = phone ? String(phone).trim() : null;
    if (email !== undefined) data.email = email ? String(email).trim() : null;
    if (typeof isActive === "boolean") data.isActive = isActive;

    const updated = await prisma.doctor.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (err) {
    console.error("[doctors PUT]", err);
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
    await prisma.doctor.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[doctors DELETE]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
