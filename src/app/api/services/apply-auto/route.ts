import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthorized, unauthorized } from "@/lib/apiAuth";

const MIN_SAMPLES = 3;
const TRIM_RATIO = 0.1;

function trimmedMean(sorted: number[]): number {
  const trim = Math.floor(sorted.length * TRIM_RATIO);
  const sliced = sorted.slice(trim, sorted.length - trim);
  if (!sliced.length) return 0;
  const sum = sliced.reduce((a, b) => a + b, 0);
  return Math.round(sum / sliced.length);
}

/**
 * POST /api/services/apply-auto
 * autoUpdate=true 인 활성 진료항목들의 waitTime을 실측 평균으로 갱신.
 * 표본 수가 MIN_SAMPLES 미만이면 스킵.
 */
export async function POST(request: NextRequest) {
  if (!(await isAdminAuthorized(request))) return unauthorized();

  try {
    const services = await prisma.service.findMany({
      where: { isActive: true, autoUpdate: true },
    });

    if (services.length === 0) {
      return NextResponse.json({ updated: 0, skipped: 0, details: [] });
    }

    const completed = await prisma.queue.findMany({
      where: {
        status: "completed",
        inProgressAt: { not: null },
        completedAt: { not: null },
      },
      select: { treatmentItems: true, inProgressAt: true, completedAt: true },
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

    const details: Array<{
      value: string;
      label: string;
      before: number;
      after: number | null;
      sampleSize: number;
      skipped: boolean;
    }> = [];

    let updated = 0;
    let skipped = 0;

    for (const svc of services) {
      const samples = (byItem.get(svc.value) ?? []).sort((a, b) => a - b);
      if (samples.length < MIN_SAMPLES) {
        skipped++;
        details.push({
          value: svc.value,
          label: svc.label,
          before: svc.waitTime,
          after: null,
          sampleSize: samples.length,
          skipped: true,
        });
        continue;
      }
      const avg = trimmedMean(samples);
      if (avg !== svc.waitTime) {
        await prisma.service.update({
          where: { id: svc.id },
          data: { waitTime: avg },
        });
        updated++;
      }
      details.push({
        value: svc.value,
        label: svc.label,
        before: svc.waitTime,
        after: avg,
        sampleSize: samples.length,
        skipped: false,
      });
    }

    return NextResponse.json({ updated, skipped, details });
  } catch (err) {
    console.error("[services/apply-auto]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
