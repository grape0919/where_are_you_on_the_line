/**
 * 기본 마스터 데이터 Seed 스크립트.
 *
 * 실행: pnpm prisma:seed
 * - 기존 데이터가 있으면 건너뛰고, 없을 때만 삽입.
 */
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }
  const prisma = new PrismaClient({ adapter: new PrismaPg(url) });

  // 기본 진료항목
  const serviceDefaults = [
    { value: "허리치료", label: "허리치료", waitTime: 15 },
    { value: "무릎치료", label: "무릎치료", waitTime: 20 },
    { value: "어깨치료", label: "어깨치료", waitTime: 10 },
    { value: "목치료", label: "목치료", waitTime: 8 },
    { value: "손/팔꿈치 치료", label: "손/팔꿈치 치료", waitTime: 12 },
  ];
  for (const svc of serviceDefaults) {
    await prisma.service.upsert({
      where: { value: svc.value },
      update: {},
      create: svc,
    });
  }
  console.log(`[seed] services: ${serviceDefaults.length}건 확보`);

  // 기본 전문과목
  const specialtyDefaults = [
    "정형외과",
    "재활의학과",
    "통증의학과",
    "신경외과",
    "마취통증의학과",
    "영상의학과",
  ];
  for (const name of specialtyDefaults) {
    await prisma.specialty.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log(`[seed] specialties: ${specialtyDefaults.length}건 확보`);

  // 기본 의사
  const doctorDefaults = [
    { name: "김의사", specialty: "정형외과", room: "101" },
    { name: "이의사", specialty: "정형외과", room: "102" },
    { name: "박의사", specialty: "재활의학과", room: "103" },
  ];
  for (const doc of doctorDefaults) {
    await prisma.doctor.upsert({
      where: { name: doc.name },
      update: {},
      create: doc,
    });
  }
  console.log(`[seed] doctors: ${doctorDefaults.length}건 확보`);

  // 기존 의사의 전문과목을 Specialty 테이블에 자동 반영 (마이그레이션 호환)
  const existingDoctors = await prisma.doctor.findMany({ where: { isActive: true } });
  const existingSpecialtyNames = new Set(
    (await prisma.specialty.findMany()).map((s) => s.name)
  );
  const toCreate = new Set<string>();
  for (const d of existingDoctors) {
    if (!existingSpecialtyNames.has(d.specialty)) toCreate.add(d.specialty);
  }
  for (const name of toCreate) {
    await prisma.specialty.create({ data: { name } });
  }
  if (toCreate.size > 0) {
    console.log(`[seed] 기존 의사 전문과목 ${toCreate.size}건 자동 등록: ${[...toCreate].join(", ")}`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
