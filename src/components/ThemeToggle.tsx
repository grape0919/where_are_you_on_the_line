"use client";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useThemePreset } from "@/app/providers";

export function ThemeToggle({ inline = false }: { inline?: boolean }) {
  const { theme, setTheme } = useThemePreset();
  return (
    <div className={inline ? "flex items-center gap-2" : "flex items-center gap-2"}>
      <Label className="text-xs">Dark</Label>
      <Switch checked={theme === "dark"} onCheckedChange={(v) => setTheme(v ? "dark" : "light")} />
    </div>
  );
}

