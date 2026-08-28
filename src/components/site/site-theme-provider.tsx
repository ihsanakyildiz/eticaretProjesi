"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { ThemeMode } from "@/config/theme-settings";

type SiteTheme = "light" | "dark";

const STORAGE_KEY = "site-theme";

type SiteThemeContextValue = {
  theme: SiteTheme;
  isDark: boolean;
  toggleTheme: () => void;
};

const SiteThemeContext = createContext<SiteThemeContextValue | null>(null);

function applyTheme(theme: SiteTheme) {
  document.documentElement.classList.toggle("site-dark", theme === "dark");
  document.documentElement.dataset.siteTheme = theme;
}

export function SiteThemeProvider({
  children,
  defaultMode = "light",
}: {
  children: ReactNode;
  defaultMode?: ThemeMode;
}) {
  const [theme, setTheme] = useState<SiteTheme>("light");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      let next: SiteTheme;
      if (stored === "dark" || stored === "light") {
        next = stored;
      } else if (defaultMode === "system") {
        next = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      } else {
        next = defaultMode === "dark" ? "dark" : "light";
      }
      setTheme(next);
      applyTheme(next);
    } catch {
      applyTheme(defaultMode === "dark" ? "dark" : "light");
    }
  }, [defaultMode]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next: SiteTheme = current === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
      applyTheme(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ theme, isDark: theme === "dark", toggleTheme }),
    [theme, toggleTheme],
  );

  return (
    <SiteThemeContext.Provider value={value}>{children}</SiteThemeContext.Provider>
  );
}

export function useSiteTheme() {
  const ctx = useContext(SiteThemeContext);
  if (!ctx) throw new Error("useSiteTheme must be used within SiteThemeProvider");
  return ctx;
}
