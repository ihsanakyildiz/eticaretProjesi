"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

function isInternalNavigationAnchor(anchor: HTMLAnchorElement) {
  if (anchor.hasAttribute("download")) return false;
  if (anchor.target && anchor.target !== "_self") return false;
  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
    return false;
  }
  try {
    const url = new URL(anchor.href, window.location.href);
    if (url.origin !== window.location.origin) return false;
    if (
      url.pathname === window.location.pathname &&
      url.search === window.location.search &&
      url.hash
    ) {
      return false;
    }
    if (
      url.pathname === window.location.pathname &&
      url.search === window.location.search &&
      !url.hash
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function RouteLoadingIndicatorInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [active, setActive] = useState(false);
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const timersRef = useRef<number[]>([]);
  const routeKey = `${pathname}?${searchParams.toString()}`;

  const clearTimers = useCallback(() => {
    for (const id of timersRef.current) window.clearTimeout(id);
    timersRef.current = [];
  }, []);

  const stop = useCallback(() => {
    clearTimers();
    setProgress(100);
    const hideId = window.setTimeout(() => {
      setActive(false);
      setVisible(false);
      setProgress(0);
    }, 220);
    timersRef.current.push(hideId);
  }, [clearTimers]);

  const start = useCallback(() => {
    clearTimers();
    setActive(true);
    setVisible(true);
    setProgress(12);

    const tick1 = window.setTimeout(() => setProgress(38), 120);
    const tick2 = window.setTimeout(() => setProgress(62), 420);
    const tick3 = window.setTimeout(() => setProgress(78), 900);
    const safety = window.setTimeout(() => stop(), 12000);
    timersRef.current.push(tick1, tick2, tick3, safety);
  }, [clearTimers, stop]);

  useEffect(() => {
    if (!active) return;
    stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when route changes
  }, [routeKey]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (!isInternalNavigationAnchor(anchor)) return;
      start();
    };

    const onSubmit = (event: SubmitEvent) => {
      if (event.defaultPrevented) return;
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      if (form.target && form.target !== "_self") return;

      const actionAttr = form.getAttribute("action");
      // Düz URL action = sayfa geçişi; server action'larda da kısa geri bildirim ver
      start();
      if (!actionAttr || actionAttr.startsWith("javascript:")) {
        const settle = window.setTimeout(() => stop(), 900);
        timersRef.current.push(settle);
      }
    };

    document.addEventListener("click", onPointerDown, true);
    document.addEventListener("submit", onSubmit, true);
    return () => {
      document.removeEventListener("click", onPointerDown, true);
      document.removeEventListener("submit", onSubmit, true);
      clearTimers();
    };
  }, [clearTimers, start, stop]);

  if (!visible) return null;

  const isAdmin = pathname.startsWith("/admin");

  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 z-[9999] h-[3px] overflow-hidden"
      >
        <div
          className={`h-full origin-left transition-[width,opacity] duration-200 ease-out ${
            isAdmin ? "bg-[#0ab39c]" : "bg-[var(--site-primary,#7c3aed)]"
          }`}
          style={{
            width: `${progress}%`,
            opacity: active ? 1 : 0,
            boxShadow: isAdmin
              ? "0 0 10px rgba(10,179,156,0.55)"
              : "0 0 10px rgba(124,58,237,0.45)",
          }}
        />
      </div>

      {isAdmin ? null : (
      <div
        role="status"
        aria-live="polite"
        aria-busy={active}
        className={`pointer-events-none fixed inset-0 z-[9998] flex items-start justify-center pt-[18vh] transition-opacity duration-200 ${
          active ? "opacity-100" : "opacity-0"
        }`}
      >
        <div
          className={`flex items-center gap-2.5 rounded-full px-4 py-2.5 text-sm font-medium shadow-lg backdrop-blur-md ${
            isAdmin
              ? "border border-[#e9ebec]/80 bg-white/95 text-slate-700"
              : "border border-site-border/70 bg-site-card/95 text-site-fg"
          }`}
        >
          <Loader2
            className={`h-4 w-4 animate-spin ${
              isAdmin ? "text-[#0ab39c]" : "text-site-primary"
            }`}
          />
          <span>Yükleniyor…</span>
        </div>
      </div>
      )}
    </>
  );
}

export function RouteLoadingIndicator({
  enabled = true,
}: {
  enabled?: boolean;
}) {
  if (!enabled) return null;
  return (
    <Suspense fallback={null}>
      <RouteLoadingIndicatorInner />
    </Suspense>
  );
}
