import { describe, it, expect } from "vitest";
import { applyPreset, getPreset, setPreset, ALL_PRESETS } from "@/lib/themePresets";

describe("tweakcn theme presets", () => {
  it("stores and applies all presets", () => {
    for (const preset of ALL_PRESETS) {
      setPreset(preset);
      expect(getPreset()).toBe(preset);
      applyPreset(preset);
      expect(document.documentElement.dataset.theme).toBe(preset);
    }
  });
});
