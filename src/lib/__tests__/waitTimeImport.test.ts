import { describe, expect, it } from "vitest";

import {
  calculateWaitTimeStats,
  getDefaultWaitTimeStrategy,
  parseWaitTimeCsv,
  type WaitTimeStrategy,
} from "@/lib/waitTimeImport";

describe("wait time import utilities", () => {
  const sampleCsv = [
    "허리치료,무릎치료,어깨치료,목치료,손/팔꿈치 치료",
    "10,20,30,40,50",
    "20,30,40,50,60",
    "15분, 25, ,35 ,45",
  ].join("\n");

  it("parses dynamic headers into datasets", () => {
    const dataset = parseWaitTimeCsv(sampleCsv);

    expect(dataset.patientCount).toBe(3);
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

  it("throws when no numeric data exists", () => {
    const emptyCsv = ["A,B,C", ",,"].join("\n");
    const dataset = parseWaitTimeCsv(emptyCsv);

    expect(() => calculateWaitTimeStats(dataset)).toThrow("숫자 데이터가 없어");
  });
});


