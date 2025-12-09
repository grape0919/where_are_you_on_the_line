import { describe, it, expect } from "vitest";

describe("env profile flags", () => {
  it("parses USE_REDIS and USE_DB flags", async () => {
    process.env.USE_REDIS = "true";
    process.env.USE_DB = "false";
    const { isRedisEnabled, isDbEnabled } = await import("@/lib/env");
    expect(isRedisEnabled()).toBe(Boolean(process.env.REDIS_URL));
    expect(isDbEnabled()).toBe(false);
  });
});

