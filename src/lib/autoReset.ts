import type { OperatingHoursRule } from "@/types/domain";
import type { QueueStore } from "@/lib/queueStore";
import { clearAllApproachingNotifications } from "@/lib/notification";
import { isDbEnabled } from "@/lib/env";

// 서버 메모리에 운영시간 설정 저장
const DEFAULT_OPERATING_HOURS: OperatingHoursRule[] = [
  { dayOfWeek: "MON", openTime: "09:00", closeTime: "18:00", isClosed: false, hasLunch: true, lunchStart: "13:00", lunchEnd: "14:00" },
  { dayOfWeek: "TUE", openTime: "09:00", closeTime: "18:00", isClosed: false, hasLunch: true, lunchStart: "13:00", lunchEnd: "14:00" },
  { dayOfWeek: "WED", openTime: "09:00", closeTime: "18:00", isClosed: false, hasLunch: true, lunchStart: "13:00", lunchEnd: "14:00" },
  { dayOfWeek: "THU", openTime: "09:00", closeTime: "18:00", isClosed: false, hasLunch: true, lunchStart: "13:00", lunchEnd: "14:00" },
  { dayOfWeek: "FRI", openTime: "09:00", closeTime: "18:00", isClosed: false, hasLunch: true, lunchStart: "13:00", lunchEnd: "14:00" },
  { dayOfWeek: "SAT", openTime: "09:00", closeTime: "13:00", isClosed: false, hasLunch: false },
  { dayOfWeek: "SUN", openTime: "09:00", closeTime: "18:00", isClosed: true, hasLunch: false },
];

let operatingHours: OperatingHoursRule[] = [...DEFAULT_OPERATING_HOURS];
let lastResetDate: string | null = null; // "yyyy-mm-dd" 형식, 당일 중복 초기화 방지
let dbLoaded = false;
let loadingPromise: Promise<void> | null = null;

export function getOperatingHours(): OperatingHoursRule[] {
  return operatingHours;
}

/**
 * 운영시간 설정 저장.
 * DB 모드일 때 실패 시 메모리 롤백 후 throw.
 */
export async function setOperatingHours(hours: OperatingHoursRule[]): Promise<void> {
  const previous = operatingHours;
  operatingHours = hours;

  if (isDbEnabled()) {
    try {
      const { prisma } = await import("@/lib/prisma");
      await prisma.setting.upsert({
        where: { key: "operatingHours" },
        update: { value: JSON.stringify(hours) },
        create: { key: "operatingHours", value: JSON.stringify(hours) },
      });
    } catch (err) {
      operatingHours = previous; // 메모리 롤백
      throw new Error(
        `Failed to persist operating hours: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
}

/** DB에서 운영시간 설정 로드 (동시 호출 안전) */
export async function loadOperatingHoursFromDb(): Promise<void> {
  if (dbLoaded || !isDbEnabled()) return;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    try {
      const { prisma } = await import("@/lib/prisma");
      const row = await prisma.setting.findUnique({ where: { key: "operatingHours" } });
      if (row) {
        operatingHours = JSON.parse(row.value) as OperatingHoursRule[];
      }
      const resetRow = await prisma.setting.findUnique({ where: { key: "lastResetDate" } });
      if (resetRow) {
        lastResetDate = resetRow.value;
      }
      dbLoaded = true;
      console.log("[autoReset] DB에서 운영시간 설정 로드 완료");
    } catch (err) {
      console.error("[autoReset] DB 설정 로드 실패:", err);
      throw err;
    } finally {
      loadingPromise = null;
    }
  })();

  return loadingPromise;
}

// 요일 인덱스 → WeekdayToken 매핑 (0=SUN, 1=MON, ..., 6=SAT)
const DAY_MAP = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;

function getTodayRule(): OperatingHoursRule | undefined {
  const dayToken = DAY_MAP[new Date().getDay()];
  return operatingHours.find((r) => r.dayOfWeek === dayToken);
}

// "HH:MM" → 분 단위로 변환
function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** 현재 시각이 오늘 영업시간 내(점심 제외)인지 확인 — UI/알림용 */
export function isWithinOperatingHours(now: Date = new Date()): boolean {
  const rule = getTodayRule();
  if (!rule || rule.isClosed) return false;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const openMinutes = timeToMinutes(rule.openTime);
  const closeMinutes = timeToMinutes(rule.closeTime);

  if (currentMinutes < openMinutes || currentMinutes >= closeMinutes) return false;

  // 점심시간 체크
  if (rule.hasLunch && rule.lunchStart && rule.lunchEnd) {
    const lunchStartMin = timeToMinutes(rule.lunchStart);
    const lunchEndMin = timeToMinutes(rule.lunchEnd);
    if (currentMinutes >= lunchStartMin && currentMinutes < lunchEndMin) return false;
  }

  return true;
}

// 자동 초기화 체크: 영업종료 + 2시간 이후인지 판단
export function shouldAutoReset(): boolean {
  const today = new Date().toISOString().slice(0, 10); // yyyy-mm-dd
  if (lastResetDate === today) return false; // 이미 오늘 초기화함

  const rule = getTodayRule();
  if (!rule || rule.isClosed) return false; // 휴무일은 초기화 불필요

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const closeMinutes = timeToMinutes(rule.closeTime);
  const resetMinutes = closeMinutes + 120; // 영업종료 + 2시간

  return currentMinutes >= resetMinutes;
}

async function markResetDone(): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  lastResetDate = today;

  if (isDbEnabled()) {
    try {
      const { prisma } = await import("@/lib/prisma");
      await prisma.setting.upsert({
        where: { key: "lastResetDate" },
        update: { value: today },
        create: { key: "lastResetDate", value: today },
      });
    } catch (err) {
      console.error("[autoReset] lastResetDate 저장 실패:", err);
      // 메모리는 유지 — 다음 시도에서 재저장
    }
  }
}

export function getLastResetDate(): string | null {
  return lastResetDate;
}

// 자동 초기화 스케줄러 시작 (1분 간격 체크)
let intervalId: ReturnType<typeof setInterval> | null = null;

export function startAutoResetScheduler(store: QueueStore): void {
  if (intervalId) return; // 이미 실행 중

  intervalId = setInterval(async () => {
    try {
      if (!shouldAutoReset()) return;
      const count = store.list().length;
      if (count > 0) {
        await store.clear();
        clearAllApproachingNotifications();
        await markResetDone();
        console.log(
          `[AutoReset] 대기열 ${count}건 초기화 완료 (${new Date().toLocaleTimeString()})`
        );
      } else {
        await markResetDone();
      }
    } catch (err) {
      console.error("[AutoReset] 자동 초기화 실패:", err);
    }
  }, 60 * 1000); // 1분 간격
}

export function stopAutoResetScheduler(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
