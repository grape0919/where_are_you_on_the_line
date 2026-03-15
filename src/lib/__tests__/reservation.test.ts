import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  assertReservationCapacity,
  buildReservationMessage,
  createReservationRecord,
  getReservationLimits,
  ReservationLimitError,
} from "@/lib/useReservation";
import { setReservationCapacityRules } from "@/lib/storage";
import type { ReservationData } from "@/types/domain";

describe("reservation creation", () => {
  it("creates a reservation record with defaults", () => {
    vi.useFakeTimers();
    const now = new Date("2025-01-01T00:00:00Z").getTime();
    vi.setSystemTime(now);
    const rec = createReservationRecord({
      name: "홍길동",
      patientId: "P123",
      phone: "010-0000-0000",
      service: "일반진료",
      date: "2025-01-10",
      timeSlot: "09:00",
    });
    expect(rec.name).toBe("홍길동");
    expect(rec.patientId).toBe("P123");
    expect(rec.estimatedWaitTime).toBe(10);
    expect(rec.createdAt).toBe(now);
    expect(rec.reservationId).toMatch(/^R-/);
    expect(rec.timeSlot).toBe("09:00");
    vi.useRealTimers();
  });

  it("formats reservation message payload consistently", () => {
    const reservation: ReservationData = {
      reservationId: "R-TEST-1234",
      name: "홍길동",
      patientId: "P123",
      phone: "010-0000-0000",
      service: "일반진료",
      date: "2025-01-10",
      timeSlot: "09:00",
      estimatedWaitTime: 10,
      createdAt: Date.now(),
    };

    const payload = buildReservationMessage(reservation, {
      hospitalName: "테스트병원",
      contact: "문의: 02-111-2222",
      channel: "sms",
    });

    expect(payload.title).toBe("[테스트병원] 예약 안내");
    expect(payload.body).toContain("예약번호: R-TEST-1234");
    expect(payload.body).toContain("문의: 02-111-2222");
  });
});

describe("reservation capacity guard", () => {
  const sampleReservation: ReservationData = {
    reservationId: "R-1",
    name: "홍길동",
    patientId: "P1",
    phone: "010-0000-0000",
    service: "일반진료",
    date: "2025-01-10",
    timeSlot: "09:00",
    estimatedWaitTime: 10,
    createdAt: Date.now(),
  };

  const limits = (
    overrides: Partial<{
      perSlot: number;
      perDay: number;
      perSlotScope: "global" | "service";
      perDayScope: "global" | "service";
    }> = {}
  ) => ({
    perSlot: overrides.perSlot ?? 4,
    perDay: overrides.perDay ?? 40,
    perSlotScope: overrides.perSlotScope ?? "global",
    perDayScope: overrides.perDayScope ?? "global",
  });

  it("allows reservation when under limits", () => {
    expect(() =>
      assertReservationCapacity("2025-01-10", "09:30", "일반진료", [sampleReservation], limits())
    ).not.toThrow();
  });

  it("throws slot limit error when time slot is full", () => {
    expect(() =>
      assertReservationCapacity(
        "2025-01-10",
        "09:00",
        "일반진료",
        [sampleReservation],
        limits({
          perSlot: 1,
        })
      )
    ).toThrowError(ReservationLimitError);
  });

  it("throws day limit error when daily capacity exhausted", () => {
    const reservations: ReservationData[] = [
      sampleReservation,
      { ...sampleReservation, reservationId: "R-2", timeSlot: "09:30" },
    ];

    expect(() =>
      assertReservationCapacity(
        "2025-01-10",
        "10:00",
        "일반진료",
        reservations,
        limits({
          perDay: 2,
        })
      )
    ).toThrowError(ReservationLimitError);
  });

  it("counts only matching service when scope is service-specific", () => {
    const otherServiceReservation: ReservationData = {
      ...sampleReservation,
      reservationId: "R-2",
      service: "재진",
    };

    expect(() =>
      assertReservationCapacity(
        "2025-01-10",
        "09:00",
        "일반진료",
        [otherServiceReservation],
        limits({
          perSlot: 1,
          perSlotScope: "service",
          perDay: 1,
          perDayScope: "service",
        })
      )
    ).not.toThrow();

    expect(() =>
      assertReservationCapacity(
        "2025-01-10",
        "09:00",
        "일반진료",
        [otherServiceReservation],
        limits({
          perSlot: 1,
          perSlotScope: "global",
        })
      )
    ).toThrowError(ReservationLimitError);

    expect(() =>
      assertReservationCapacity(
        "2025-01-10",
        "09:00",
        "일반진료",
        [otherServiceReservation, sampleReservation],
        limits({
          perDay: 1,
          perDayScope: "service",
        })
      )
    ).toThrowError(ReservationLimitError);
  });
});

describe("reservation limits with rules", () => {
  beforeEach(() => {
    setReservationCapacityRules([]);
  });

  afterEach(() => {
    setReservationCapacityRules([]);
  });

  it("applies global rules for matching weekday", () => {
    setReservationCapacityRules([
      {
        id: "rule-1",
        service: "ALL",
        dayOfWeek: "MON",
        perSlot: 6,
        perDay: 24,
        isActive: true,
      },
    ]);

    const limits = getReservationLimits("일반진료", "2025-01-06");
    expect(limits.perDay).toBe(24);
    expect(limits.perDayScope).toBe("global");
    expect(limits.perSlot).toBe(6);
  });

  it("prefers service-specific overrides over global rules", () => {
    setReservationCapacityRules([
      {
        id: "rule-1",
        service: "ALL",
        dayOfWeek: "ALL",
        perSlot: 5,
        perDay: 30,
        isActive: true,
      },
      {
        id: "rule-2",
        service: "일반진료",
        dayOfWeek: "FRI",
        perSlot: 3,
        perDay: 12,
        isActive: true,
      },
    ]);

    const limits = getReservationLimits("일반진료", "2025-01-03");
    expect(limits.perSlot).toBe(3);
    expect(limits.perSlotScope).toBe("service");
    expect(limits.perDay).toBe(12);
    expect(limits.perDayScope).toBe("service");
  });
});
