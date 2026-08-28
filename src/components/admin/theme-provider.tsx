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

export type AdminTheme = "light" | "dark";

const STORAGE_KEY = "admin-theme";
const DARK_CLASS = "admin-dark";

type ThemeContextValue = {
  theme: AdminTheme;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (theme: AdminTheme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyThemeClass(theme: AdminTheme) {
  document.documentElement.classList.toggle(DARK_CLASS, theme === "dark");
  document.documentElement.dataset.adminTheme = theme;
}

export function getStoredAdminTheme(): AdminTheme {
  if (typeof window === "undefined") return "light";
  try {
    return localStorage.getItem(STORAGE_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function AdminThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<AdminTheme>("light");

  useEffect(() => {
    const stored = getStoredAdminTheme();
    setThemeState(stored);
    applyThemeClass(stored);
  }, []);

  const setTheme = useCallback((next: AdminTheme) => {
    setThemeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
    applyThemeClass(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const next: AdminTheme = current === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
      applyThemeClass(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      theme,
      isDark: theme === "dark",
      toggleTheme,
      setTheme,
    }),
    [theme, toggleTheme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAdminTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useAdminTheme must be used within AdminThemeProvider");
  }
  return ctx;
}
