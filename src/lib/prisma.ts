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
      max: 10, // 최대 연결 수
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.pgPool = pool;
  }

  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/** Graceful shutdown (SIGTERM 등에서 호출) */
export async function closePrisma(): Promise<void> {
  await prisma.$disconnect();
  if (globalForPrisma.pgPool) {
    await globalForPrisma.pgPool.end();
  }
}
