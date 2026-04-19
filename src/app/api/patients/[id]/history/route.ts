import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthorized, unauthorized } from "@/lib/apiAuth";

/**
 * GET /api/patients/:id/history
 * 특정 환자의 접수 이력 조회 (Queue 테이블 기반).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthorized(request))) return unauthorized();

  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam, 10);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: "Invalid patient id" }, { status: 400 });
    }

    const patient = await prisma.patient.findUnique({ where: { id } });
    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    // patientId FK 또는 phone(과거 데이터 호환) 모두 조회
    const queues = await prisma.queue.findMany({
      where: {
        OR: [{ patientId: id }, { phone: patient.phone }],
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const history = queues.map((q) => ({
      id: q.id,
      token: q.token,
      treatmentItems: q.treatmentItems,
      doctor: q.doctor,
      status: q.status,
      createdAt: Number(q.createdAt),
      confirmedAt: q.confirmedAt ? Number(q.confirmedAt) : null,
      inProgressAt: q.inProgressAt ? Number(q.inProgressAt) : null,
      completedAt: q.completedAt ? Number(q.completedAt) : null,
      cancelledAt: q.cancelledAt ? Number(q.cancelledAt) : null,
      cancelReason: q.cancelReason,
      totalEstimatedMinutes: q.totalEstimatedMinutes,
    }));

    return NextResponse.json({ patient, history });
  } catch (err) {
    console.error("[patients/:id/history]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
