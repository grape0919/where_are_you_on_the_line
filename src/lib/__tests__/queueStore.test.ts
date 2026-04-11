import { describe, it, expect } from "vitest";
import {
  InMemoryQueueStore,
  VALID_STATUS_TRANSITIONS,
  computeQueueMetrics,
  recalculateAllMetrics,
} from "@/lib/queueStore";
import type { QueueData } from "@/types/queue";

function makeItem(overrides: Partial<QueueData> = {}): QueueData {
  return {
    token: "Q-TEST-001",
    name: "홍길동",
    phone: "01012345678",
    treatmentItems: ["일반진료"],
    totalEstimatedMinutes: 10,
    status: "confirmed",
    estimatedWaitTime: 0,
    queuePosition: 0,
    patientsAhead: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

describe("InMemoryQueueStore", () => {
  it("stores and retrieves an item", () => {
    const store = new InMemoryQueueStore();
    const item = makeItem();
    store.set(item);
    expect(store.get("Q-TEST-001")).toEqual(item);
  });

  it("lists all items", () => {
    const store = new InMemoryQueueStore();
    store.set(makeItem({ token: "A" }));
    store.set(makeItem({ token: "B" }));
    expect(store.list()).toHaveLength(2);
  });

  it("filters by status with listByStatus", () => {
    const store = new InMemoryQueueStore();
    store.set(makeItem({ token: "A", status: "confirmed" }));
    store.set(makeItem({ token: "B", status: "in_progress" }));
    store.set(makeItem({ token: "C", status: "confirmed" }));
    store.set(makeItem({ token: "D", status: "completed" }));

    expect(store.listByStatus("confirmed")).toHaveLength(2);
    expect(store.listByStatus("in_progress")).toHaveLength(1);
    expect(store.listByStatus("completed")).toHaveLength(1);
    expect(store.listByStatus("cancelled")).toHaveLength(0);
  });

  it("deletes an item", () => {
    const store = new InMemoryQueueStore();
    store.set(makeItem());
    expect(store.delete("Q-TEST-001")).toBe(true);
    expect(store.get("Q-TEST-001")).toBeUndefined();
  });
});

describe("VALID_STATUS_TRANSITIONS", () => {
  it("allows confirmed → in_progress", () => {
    expect(VALID_STATUS_TRANSITIONS.confirmed).toContain("in_progress");
  });

  it("allows confirmed → cancelled", () => {
    expect(VALID_STATUS_TRANSITIONS.confirmed).toContain("cancelled");
  });

  it("allows in_progress → completed", () => {
    expect(VALID_STATUS_TRANSITIONS.in_progress).toContain("completed");
  });

  it("disallows confirmed → completed directly", () => {
    expect(VALID_STATUS_TRANSITIONS.confirmed).not.toContain("completed");
  });

  it("disallows completed → any", () => {
    expect(VALID_STATUS_TRANSITIONS.completed).toHaveLength(0);
  });
});

describe("computeQueueMetrics (담당의별 큐)", () => {
  it("returns position 1 for first patient", () => {
    const store = new InMemoryQueueStore();
    store.set(makeItem({ token: "A", totalEstimatedMinutes: 10, doctor: "김의사" }));

    const metrics = computeQueueMetrics("A", store);
    expect(metrics.queuePosition).toBe(1);
    expect(metrics.patientsAhead).toBe(0);
    expect(metrics.estimatedWaitTime).toBe(0);
  });

  it("calculates wait time based on same doctor patients ahead", () => {
    const store = new InMemoryQueueStore();
    const now = Date.now();
    store.set(makeItem({ token: "A", totalEstimatedMinutes: 10, doctor: "김의사", createdAt: now - 3000 }));
    store.set(makeItem({ token: "B", totalEstimatedMinutes: 15, doctor: "김의사", createdAt: now - 2000 }));
    store.set(makeItem({ token: "C", totalEstimatedMinutes: 5, doctor: "김의사", createdAt: now - 1000 }));

    const metricsC = computeQueueMetrics("C", store, now);
    expect(metricsC.queuePosition).toBe(3);
    expect(metricsC.patientsAhead).toBe(2);
    expect(metricsC.estimatedWaitTime).toBe(25); // 10 + 15
  });

  it("different doctors have independent queues", () => {
    const store = new InMemoryQueueStore();
    const now = Date.now();
    store.set(makeItem({ token: "A", totalEstimatedMinutes: 10, doctor: "김의사", createdAt: now - 3000 }));
    store.set(makeItem({ token: "B", totalEstimatedMinutes: 15, doctor: "박의사", createdAt: now - 2000 }));

    const metricsA = computeQueueMetrics("A", store, now);
    expect(metricsA.queuePosition).toBe(1);
    expect(metricsA.patientsAhead).toBe(0);

    const metricsB = computeQueueMetrics("B", store, now);
    expect(metricsB.queuePosition).toBe(1);
    expect(metricsB.patientsAhead).toBe(0);
    expect(metricsB.estimatedWaitTime).toBe(0);
  });

  it("accounts for in_progress remaining time within same doctor", () => {
    const store = new InMemoryQueueStore();
    const now = Date.now();
    store.set(
      makeItem({
        token: "A",
        status: "in_progress",
        totalEstimatedMinutes: 20,
        inProgressAt: now - 5 * 60 * 1000,
        doctor: "김의사",
        createdAt: now - 10000,
      })
    );
    store.set(makeItem({ token: "B", totalEstimatedMinutes: 10, doctor: "김의사", createdAt: now - 5000 }));

    const metricsB = computeQueueMetrics("B", store, now);
    expect(metricsB.patientsAhead).toBe(1);
    expect(metricsB.estimatedWaitTime).toBe(15); // 20 - 5 = 15분 남음
  });
});

describe("recalculateAllMetrics (담당의별)", () => {
  it("updates positions within same doctor group", () => {
    const store = new InMemoryQueueStore();
    const now = Date.now();
    store.set(makeItem({ token: "A", totalEstimatedMinutes: 10, doctor: "김의사", createdAt: now - 3000 }));
    store.set(makeItem({ token: "B", totalEstimatedMinutes: 15, doctor: "김의사", createdAt: now - 2000 }));
    store.set(makeItem({ token: "C", totalEstimatedMinutes: 5, doctor: "김의사", createdAt: now - 1000 }));

    recalculateAllMetrics(store, now);

    expect(store.get("A")!.queuePosition).toBe(1);
    expect(store.get("A")!.estimatedWaitTime).toBe(0);
    expect(store.get("B")!.queuePosition).toBe(2);
    expect(store.get("B")!.estimatedWaitTime).toBe(10);
    expect(store.get("C")!.queuePosition).toBe(3);
    expect(store.get("C")!.estimatedWaitTime).toBe(25);
  });

  it("different doctors get independent positions", () => {
    const store = new InMemoryQueueStore();
    const now = Date.now();
    store.set(makeItem({ token: "A", totalEstimatedMinutes: 10, doctor: "김의사", createdAt: now - 3000 }));
    store.set(makeItem({ token: "B", totalEstimatedMinutes: 15, doctor: "박의사", createdAt: now - 2000 }));
    store.set(makeItem({ token: "C", totalEstimatedMinutes: 5, doctor: "김의사", createdAt: now - 1000 }));

    recalculateAllMetrics(store, now);

    // 김의사 큐: A(1번), C(2번)
    expect(store.get("A")!.queuePosition).toBe(1);
    expect(store.get("A")!.estimatedWaitTime).toBe(0);
    expect(store.get("C")!.queuePosition).toBe(2);
    expect(store.get("C")!.estimatedWaitTime).toBe(10); // A의 10분만 대기

    // 박의사 큐: B(1번)
    expect(store.get("B")!.queuePosition).toBe(1);
    expect(store.get("B")!.estimatedWaitTime).toBe(0);
  });
});
