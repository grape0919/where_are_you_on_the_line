import { NextResponse } from "next/server";

type HealthStatus = "ok" | "degraded";

interface HealthResponse {
  status: HealthStatus;
  db: {
    reachable: boolean;
    message?: string;
  };
  uptimeSec: number;
}

const startedAt = Date.now();

/**
 * 시스템 헬스 체크.
 * PostgreSQL에 가벼운 SELECT 1 쿼리로 도달 가능 여부 확인.
 */
export async function GET() {
  const uptimeSec = Math.floor((Date.now() - startedAt) / 1000);

  try {
    const { prisma } = await import("@/lib/prisma");
    await prisma.$queryRaw`SELECT 1`;
    const body: HealthResponse = {
      status: "ok",
      db: { reachable: true },
      uptimeSec,
    };
    return NextResponse.json(body);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const body: HealthResponse = {
      status: "degraded",
      db: { reachable: false, message },
      uptimeSec,
    };
    return NextResponse.json(body, { status: 503 });
  }
}
