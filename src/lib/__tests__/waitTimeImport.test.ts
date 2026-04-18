import { describe, expect, it } from "vitest";

import {
  calculateWaitTimeStats,
  getDefaultWaitTimeStrategy,
  parseWaitTimeCsv,
  type WaitTimeStrategy,
} from "@/lib/waitTimeImport";

describe("wait time import utilities", () => {
  // long format: 각 행 = 진료항목 + 대기시간
  const sampleCsv = [
    "진료항목,대기시간(분)",
    "허리치료,10",
    "허리치료,20",
    "허리치료,15분",
    "무릎치료,20",
    "무릎치료,30",
    "무릎치료,25",
    "어깨치료,30",
    "어깨치료,40",
    "목치료,40",
    "목치료,50",
    "목치료,35",
    "손/팔꿈치 치료,50",
    "손/팔꿈치 치료,60",
    "손/팔꿈치 치료,45",
  ].join("\n");

  it("parses long format into datasets grouped by label", () => {
    const dataset = parseWaitTimeCsv(sampleCsv);

    expect(dataset.patientCount).toBe(14);
    expect(dataset.datasets.map((item) => item.label)).toEqual([
      "허리치료",
      "무릎치료",
      "어깨치료",
      "목치료",
      "손/팔꿈치 치료",
    ]);
    expect(dataset.datasets[0]?.samples).toEqual([10, 20, 15]);
  });

  it("calculates averages using the default strategy", () => {
    const dataset = parseWaitTimeCsv(sampleCsv);
    const result = calculateWaitTimeStats(dataset);

    expect(result.stats).toEqual([
      { label: "허리치료", value: "허리치료", waitTime: 15, sampleSize: 3 },
      { label: "무릎치료", value: "무릎치료", waitTime: 25, sampleSize: 3 },
      { label: "어깨치료", value: "어깨치료", waitTime: 35, sampleSize: 2 },
      { label: "목치료", value: "목치료", waitTime: 42, sampleSize: 3 },
      { label: "손/팔꿈치 치료", value: "손/팔꿈치 치료", waitTime: 52, sampleSize: 3 },
    ]);
    expect(result.strategy.id).toBe(getDefaultWaitTimeStrategy().id);
  });

  it("supports custom strategies", () => {
    const dataset = parseWaitTimeCsv(sampleCsv);
    const maxStrategy: WaitTimeStrategy = {
      id: "max",
      label: "최대값",
      calculate: (entry) => {
        if (!entry.samples.length) return null;
        return {
          label: entry.label,
          value: entry.value,
          waitTime: Math.max(...entry.samples),
          sampleSize: entry.samples.length,
        };
      },
    };

    const result = calculateWaitTimeStats(dataset, maxStrategy);

    expect(result.stats[0]).toEqual({
      label: "허리치료",
      value: "허리치료",
      waitTime: 20,
      sampleSize: 3,
    });
    expect(result.strategy.id).toBe("max");
  });

  it("ignores rows with missing labels or invalid numbers", () => {
    const csv = [
      "진료항목,대기시간(분)",
      "허리치료,15",
      ",20",
      "무릎치료,",
      "무릎치료,abc",
      "무릎치료,25",
    ].join("\n");

    const dataset = parseWaitTimeCsv(csv);
    const result = calculateWaitTimeStats(dataset);

    expect(result.stats).toEqual([
      { label: "허리치료", value: "허리치료", waitTime: 15, sampleSize: 1 },
      { label: "무릎치료", value: "무릎치료", waitTime: 25, sampleSize: 1 },
    ]);
  });
});
