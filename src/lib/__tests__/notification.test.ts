import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  checkAndNotifyApproaching,
  clearApproachingNotification,
  clearAllApproachingNotifications,
  APPROACHING_THRESHOLD_MINUTES,
} from "@/lib/notification";
import { InMemoryQueueStore } from "@/lib/queueStore";
import type { QueueData } from "@/types/queue";

function makePatient(override: Partial<QueueData>): QueueData {
  return {
    token: "T-001",
    name: "홍길동",
    phone: "010-0000-0000",
    treatmentItems: ["도수치료"],
    totalEstimatedMinutes: 30,
    status: "confirmed",
    estimatedWaitTime: 5,
    queuePosition: 1,
    patientsAhead: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    confirmedAt: Date.now(),
    ...override,
  };
}

describe("notification", () => {
  let store: InMemoryQueueStore;

  beforeEach(() => {
    store = new InMemoryQueueStore();
    clearAllApproachingNotifications();
    vi.restoreAllMocks();
  });

  it("대기시간이 임계값 이하인 환자에게 알림을 보낸다", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    await store.set(makePatient({ estimatedWaitTime: APPROACHING_THRESHOLD_MINUTES - 1 }));

    checkAndNotifyApproaching(store);

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("[Notification]"));
  });

  it("대기시간이 임계값보다 크면 알림을 보내지 않는다", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    await store.set(makePatient({ estimatedWaitTime: APPROACHING_THRESHOLD_MINUTES + 1 }));

    checkAndNotifyApproaching(store);

    expect(logSpy).not.toHaveBeenCalled();
  });

  it("동일 환자에게 중복 알림을 보내지 않는다", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    await store.set(makePatient({ estimatedWaitTime: 5 }));

    checkAndNotifyApproaching(store);
    checkAndNotifyApproaching(store);

    // sendNotification은 async지만 console.log는 동기 호출
    expect(logSpy).toHaveBeenCalledTimes(1);
  });

  it("clearApproachingNotification 후 다시 알림을 보낼 수 있다", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const token = "T-001";
    await store.set(makePatient({ token, estimatedWaitTime: 5 }));

    checkAndNotifyApproaching(store);
    clearApproachingNotification(token);
    checkAndNotifyApproaching(store);

    expect(logSpy).toHaveBeenCalledTimes(2);
  });

  it("in_progress 환자에게는 confirmed 알림을 보내지 않는다", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    await store.set(makePatient({ status: "in_progress", estimatedWaitTime: 0 }));

    checkAndNotifyApproaching(store);

    expect(logSpy).not.toHaveBeenCalled();
  });
});
