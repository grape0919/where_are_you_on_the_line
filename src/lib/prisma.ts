import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  pgPool?: Pool;
};

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  // 연결 풀 설정 (병원 규모: 동시 접속 많지 않으나 안정성 확보)
  const pool =
    globalForPrisma.pgPool ??
    new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.pgPool = pool;
  }

  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

function getClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createClient();
  }
  return globalForPrisma.prisma;
}

/**
 * Lazy Proxy로 export.
 * 모듈 import 시점에는 createClient()를 호출하지 않고,
 * 실제 prisma.xxx 메서드 접근 시점에 client 생성.
 *
 * Next.js build의 "Collecting page data" 단계에서 API route 모듈을 evaluate하는데,
 * 빌드 시점에는 DATABASE_URL이 없을 수 있으므로 lazy 초기화 필수.
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getClient(), prop, receiver);
  },
});

/** Graceful shutdown (SIGTERM 등에서 호출) */
export async function closePrisma(): Promise<void> {
  if (globalForPrisma.prisma) {
    await globalForPrisma.prisma.$disconnect();
  }
  if (globalForPrisma.pgPool) {
    await globalForPrisma.pgPool.end();
  }
}
