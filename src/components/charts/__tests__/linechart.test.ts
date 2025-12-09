import { describe, it, expect } from "vitest";
import { computeLinePath } from "@/components/charts/LineChart";

describe("LineChart computeLinePath", () => {
  it("creates a valid SVG path for points", () => {
    const d = computeLinePath(
      [
        { x: 0, y: 0 },
        { x: 1, y: 2 },
        { x: 2, y: 1 },
      ],
      200,
      100
    );
    expect(d.startsWith("M")).toBe(true);
    expect(d.includes("L")).toBe(true);
  });
});

