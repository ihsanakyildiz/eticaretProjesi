"use client";

import {
  createContext,
  useContext,
  useEffect,
  type ReactNode,
} from "react";
import {
  DEFAULT_SITE_PERFORMANCE,
  type SitePerformance,
} from "@/lib/performance";

const PerformanceContext = createContext<SitePerformance>(
  DEFAULT_SITE_PERFORMANCE,
);

export function usePerformance() {
  return useContext(PerformanceContext);
}

export function PerformanceProvider({
  value,
  children,
}: {
  value: SitePerformance;
  children: ReactNode;
}) {
  useEffect(() => {
    const iframes = document.querySelectorAll("iframe");
    iframes.forEach((frame) => {
      if (value.lazyIframes) {
        if (!frame.getAttribute("loading")) {
          frame.setAttribute("loading", "lazy");
        }
      } else {
        frame.setAttribute("loading", "eager");
      }
    });
  }, [value.lazyIframes]);

  return (
    <PerformanceContext.Provider value={value}>
      {children}
    </PerformanceContext.Provider>
  );
}
