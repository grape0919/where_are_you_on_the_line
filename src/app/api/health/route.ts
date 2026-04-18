import { NextResponse } from "next/server";
import { isDbEnabled } from "@/lib/env";

type HealthStatus = "ok" | "degraded";

interface HealthResponse {
  status: HealthStatus;
  db: {
    enabled: boolean;
    reachable: boolean;
    message?: string;
  };
  uptimeSec: number;
}

const startedAt = Date.now();

/**
 * 시스템 헬스 체크.
 * - USE_DB=false: 항상 ok (InMemoryStore)
 * - USE_DB=true: 가벼운 SELECT 1 쿼리로 DB 도달 가능 여부 확인
 */
export async function GET() {
  const uptimeSec = Math.floor((Date.now() - startedAt) / 1000);

  if (!isDbEnabled()) {
    const body: HealthResponse = {
      status: "ok",
      db: { enabled: false, reachable: true, message: "DB 모드 비활성화 (인메모리)" },
      uptimeSec,
    };
    return NextResponse.json(body);
  }

  try {
    const { prisma } = await import("@/lib/prisma");
    await prisma.$queryRaw`SELECT 1`;
    const body: HealthResponse = {
      status: "ok",
      db: { enabled: true, reachable: true },
      uptimeSec,
    };
    return NextResponse.json(body);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const body: HealthResponse = {
      status: "degraded",
      db: { enabled: true, reachable: false, message },
      uptimeSec,
    };
    return NextResponse.json(body, { status: 503 });
  }
}
