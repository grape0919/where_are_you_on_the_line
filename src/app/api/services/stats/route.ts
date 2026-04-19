import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthorized, unauthorized } from "@/lib/apiAuth";
import type { ServiceStat } from "@/types/domain";

const MIN_SAMPLES_FOR_AVG = 3;
const TRIM_RATIO = 0.1; // 상하위 10% 절사

function trimmedMean(sorted: number[]): number {
  const trim = Math.floor(sorted.length * TRIM_RATIO);
  const sliced = sorted.slice(trim, sorted.length - trim);
  if (!sliced.length) return 0;
  const sum = sliced.reduce((a, b) => a + b, 0);
  return Math.round(sum / sliced.length);
}

function median(sorted: number[]): number {
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Math.round((sorted[mid - 1]! + sorted[mid]!) / 2);
  }
  return sorted[mid]!;
}

/**
 * GET /api/services/stats
 * 진료항목별 실측 통계 반환.
 * 집계 기준: treatmentItems 길이 = 1 + status = completed + inProgressAt, completedAt 모두 존재
 */
export async function GET(request: NextRequest) {
  if (!(await isAdminAuthorized(request))) return unauthorized();

  try {
    const services = await prisma.service.findMany({
      where: { isActive: true },
      orderBy: { id: "asc" },
    });

    // 완료된 단일 진료항목 환자들만 조회
    const completed = await prisma.queue.findMany({
      where: {
        status: "completed",
        inProgressAt: { not: null },
        completedAt: { not: null },
      },
      select: {
        treatmentItems: true,
        inProgressAt: true,
        completedAt: true,
      },
    });

    const byItem = new Map<string, number[]>();
    for (const row of completed) {
      if (row.treatmentItems.length !== 1) continue;
      const item = row.treatmentItems[0]!;
      const durationMin = Math.round(
        (Number(row.completedAt) - Number(row.inProgressAt)) / 60_000
      );
      if (durationMin <= 0 || durationMin > 1440) continue;
      const arr = byItem.get(item) ?? [];
      arr.push(durationMin);
      byItem.set(item, arr);
    }

    const stats: ServiceStat[] = services.map((svc) => {
      const samples = (byItem.get(svc.value) ?? []).sort((a, b) => a - b);
      const sampleSize = samples.length;
      const hasEnough = sampleSize >= MIN_SAMPLES_FOR_AVG;

      return {
        serviceId: svc.id,
        value: svc.value,
        label: svc.label,
        waitTime: svc.waitTime,
        autoUpdate: svc.autoUpdate,
        sampleSize,
        avgMinutes: hasEnough ? trimmedMean(samples) : null,
        medianMinutes: hasEnough ? median(samples) : null,
        minMinutes: samples[0] ?? null,
        maxMinutes: samples[samples.length - 1] ?? null,
      };
    });

    return NextResponse.json({ stats, minSamples: MIN_SAMPLES_FOR_AVG });
  } catch (err) {
    console.error("[services/stats]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
