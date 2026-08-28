"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  applySidebarDataset,
  readStoredSidebarMode,
  resolveSidebarCollapsed,
  SIDEBAR_AUTO_COLLAPSE_MAX,
  SIDEBAR_DESKTOP_MIN,
  writeStoredSidebarMode,
  type SidebarMode,
} from "@/lib/admin-sidebar-preference";

type SidebarContextValue = {
  isOpen: boolean;
  toggle: () => void;
  close: () => void;
  isDesktop: boolean;
  mode: SidebarMode;
  isCollapsed: boolean;
  allowTransition: boolean;
  toggleCollapsed: () => void;
  setMode: (mode: SidebarMode) => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

type SidebarProviderProps = {
  children: ReactNode;
  /** Sunucunun cookie'den okuduğu son masaüstü görünümü */
  initialCollapsed?: boolean;
};

export function SidebarProvider({
  children,
  initialCollapsed = false,
}: SidebarProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setModeState] = useState<SidebarMode>(() => {
    if (typeof window !== "undefined") return readStoredSidebarMode();
    // SSR: cookie ile aynı görünümü üret
    return initialCollapsed ? "collapsed" : "expanded";
  });
  // Sunucu ile aynı ilk görünüm — menü boşalıp dolmasın
  const [viewportWidth, setViewportWidth] = useState(() => {
    if (typeof window !== "undefined") return window.innerWidth;
    return initialCollapsed
      ? SIDEBAR_DESKTOP_MIN
      : SIDEBAR_AUTO_COLLAPSE_MAX;
  });
  const [allowTransition, setAllowTransition] = useState(false);

  useLayoutEffect(() => {
    const width = window.innerWidth;
    const storedMode = readStoredSidebarMode();
    const collapsed = resolveSidebarCollapsed(storedMode, width);

    setModeState(storedMode);
    setViewportWidth(width);
    applySidebarDataset(collapsed);
    if (width < SIDEBAR_DESKTOP_MIN) {
      setIsOpen(false);
    }

    const frame = requestAnimationFrame(() => {
      setAllowTransition(true);
    });

    const syncWidth = () => {
      const nextWidth = window.innerWidth;
      setViewportWidth(nextWidth);
      setModeState((current) => {
        applySidebarDataset(resolveSidebarCollapsed(current, nextWidth));
        return current;
      });
      if (nextWidth < SIDEBAR_DESKTOP_MIN) {
        setIsOpen(false);
      }
    };

    window.addEventListener("resize", syncWidth);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", syncWidth);
    };
  }, []);

  const isDesktop = viewportWidth >= SIDEBAR_DESKTOP_MIN;
  const isCollapsed = resolveSidebarCollapsed(mode, viewportWidth);

  const setMode = useCallback((next: SidebarMode) => {
    setModeState(next);
    writeStoredSidebarMode(next);
    const width =
      typeof window !== "undefined" ? window.innerWidth : SIDEBAR_DESKTOP_MIN;
    applySidebarDataset(resolveSidebarCollapsed(next, width));
  }, []);

  const toggleCollapsed = useCallback(() => {
    setModeState((current) => {
      const width =
        typeof window !== "undefined" ? window.innerWidth : SIDEBAR_DESKTOP_MIN;
      const currentlyCollapsed = resolveSidebarCollapsed(current, width);
      const next: SidebarMode = currentlyCollapsed ? "expanded" : "collapsed";
      writeStoredSidebarMode(next);
      applySidebarDataset(resolveSidebarCollapsed(next, width));
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      isOpen,
      toggle: () => setIsOpen((v) => !v),
      close: () => setIsOpen(false),
      isDesktop,
      mode,
      isCollapsed,
      allowTransition,
      toggleCollapsed,
      setMode,
    }),
    [
      isOpen,
      isDesktop,
      mode,
      isCollapsed,
      allowTransition,
      toggleCollapsed,
      setMode,
    ],
  );

  return (
    <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within SidebarProvider");
  }
  return context;
}
