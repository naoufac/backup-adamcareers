"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark";

interface ThemeCtx {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolved: Theme;
}

const Ctx = createContext<ThemeCtx>({
  theme: "light",
  setTheme: () => {},
  resolved: "light",
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    const saved = window.localStorage.getItem("adam-theme") as Theme | null;
    if (saved) setThemeState(saved);
  }, []);

  const setTheme = (next: Theme) => {
    setThemeState(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("adam-theme", next);
    }
  };

  return <Ctx.Provider value={{ theme, setTheme, resolved: theme }}>{children}</Ctx.Provider>;
}

export function useTheme() {
  return useContext(Ctx);
}
