import { describe, it, expect } from "vitest";
import { computeRemainingWait } from "@/lib/queueStore";

describe("ETA computation", () => {
  it("returns full time if no time passed", () => {
    const now = Date.now();
    const created = now;
    expect(computeRemainingWait(created, 10, now)).toBe(10);
  });

  it("floors elapsed minutes", () => {
    const created = Date.now();
    const later = created + 90 * 1000; // 1.5 minutes
    expect(computeRemainingWait(created, 10, later)).toBe(9);
  });

  it("never goes below zero", () => {
    const created = Date.now();
    const later = created + 9999 * 60 * 1000; // a long time later
    expect(computeRemainingWait(created, 3, later)).toBe(0);
  });
});

