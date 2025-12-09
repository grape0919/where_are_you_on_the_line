import { describe, it, expect } from "vitest";

describe("dev defaults", () => {
  it("disabled by default", async () => {
    delete process.env.NEXT_PUBLIC_DEV_PREFILL;
    const { devPrefillEnabled, getRegisterPrefill, getReservationPrefill, getTokenPrefill } = await import(
      "@/lib/devDefaults"
    );
    expect(devPrefillEnabled()).toBe(false);
    expect(getRegisterPrefill()).toBeNull();
    expect(getReservationPrefill()).toBeNull();
    expect(getTokenPrefill()).toBe("");
  });
  it("enabled when flag is true", async () => {
    process.env.NEXT_PUBLIC_DEV_PREFILL = "true";
    const { devPrefillEnabled, getRegisterPrefill, getReservationPrefill, getTokenPrefill } = await import(
      "@/lib/devDefaults"
    );
    expect(devPrefillEnabled()).toBe(true);
    expect(getRegisterPrefill()).not.toBeNull();
    expect(getReservationPrefill()).not.toBeNull();
    expect(getTokenPrefill()).toBeTypeOf("string");
  });
});

