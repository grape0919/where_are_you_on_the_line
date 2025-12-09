// app/providers.tsx
"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useMemo, useState, createContext, useContext } from "react";
import { applyPreset, getPreset, setPreset, type ThemePreset } from "@/lib/themePresets";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5_000,
      refetchOnWindowFocus: "always",
      refetchOnReconnect: true,
      retry: 2,
    },
  },
});

type ThemeContextValue = { theme: ThemePreset; setTheme: (t: ThemePreset) => void };
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function useThemePreset() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useThemePreset must be used within Providers");
  return ctx;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemePreset>("light");

  useEffect(() => {
    const current = getPreset();
    setTheme(current);
    applyPreset(current);
  }, []);

  const handleSetTheme = (preset: ThemePreset) => {
    setTheme(preset);
    setPreset(preset);
    applyPreset(preset);
  };

  const value = useMemo<ThemeContextValue>(() => ({ theme, setTheme: handleSetTheme }), [theme]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
    </QueryClientProvider>
  );
}
