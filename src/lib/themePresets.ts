export type ThemePreset = "light" | "dark" | string;

const LS_KEY = "theme:preset";

export function getPreset(): ThemePreset {
  if (typeof window === "undefined") return "light";
  const v = window.localStorage.getItem(LS_KEY) as ThemePreset | null;
  return v ?? "light";
}

export function setPreset(preset: ThemePreset) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LS_KEY, preset);
}

export function applyPreset(preset: ThemePreset) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = preset;
  if (preset === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

export const TWEAKCN_PRESETS = [
  "amber-minimal",
  "amethyst-haze",
  "bold-tech",
  "bubblegum",
  "caffeine",
  "candyland",
  "catppuccin",
  "claude",
  "claymorphism",
  "clean-slate",
  "cosmic-night",
  "cyberpunk",
  "darkmatter",
  "doom-64",
  "elegant-luxury",
  "graphite",
  "kodama-grove",
  "midnight-bloom",
  "mocha-mousse",
  "modern-minimal",
  "mono",
  "nature",
  "neo-brutalism",
  "northern-lights",
  "notebook",
  "ocean-breeze",
  "pastel-dreams",
  "perpetuity",
  "quantum-rose",
  "retro-arcade",
  "soft-pop",
  "solar-dusk",
  "starry-night",
  "sunset-horizon",
  "supabase",
  "t3-chat",
  "tangerine",
  "twitter",
  "vercel",
  "vintage-paper",
  "violet-bloom",
] as const;

export const ALL_PRESETS: string[] = ["light", "dark"];
