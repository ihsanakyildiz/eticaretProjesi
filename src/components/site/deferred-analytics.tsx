"use client";

import { useEffect } from "react";

type DeferredAnalyticsProps = {
  enabled: boolean;
  defer: boolean;
  delayMs: number;
  googleAnalyticsId?: string;
  googleTagManagerId?: string;
};

function loadAnalytics(gaId?: string, gtmId?: string) {
  if (gtmId) {
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(gtmId)}`;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
  }

  if (gaId) {
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    const gtag = (...args: unknown[]) => {
      window.dataLayer.push(args);
    };
    window.gtag = gtag;
    gtag("js", new Date());
    gtag("config", gaId, { send_page_view: true });
  }
}

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function DeferredAnalytics({
  enabled,
  defer,
  delayMs,
  googleAnalyticsId,
  googleTagManagerId,
}: DeferredAnalyticsProps) {
  useEffect(() => {
    if (!enabled) return;
    if (!googleAnalyticsId && !googleTagManagerId) return;

    let loaded = false;
    const handles: {
      timeoutId?: ReturnType<typeof setTimeout>;
      idleId?: number;
    } = {};

    const run = () => {
      if (loaded) return;
      loaded = true;
      loadAnalytics(googleAnalyticsId, googleTagManagerId);
      cleanup();
    };

    const cleanup = () => {
      if (handles.timeoutId) clearTimeout(handles.timeoutId);
      if (handles.idleId !== undefined && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(handles.idleId);
      }
      window.removeEventListener("scroll", run);
      window.removeEventListener("pointerdown", run);
      window.removeEventListener("keydown", run);
    };

    if (!defer) {
      run();
      return cleanup;
    }

    window.addEventListener("scroll", run, { once: true, passive: true });
    window.addEventListener("pointerdown", run, { once: true });
    window.addEventListener("keydown", run, { once: true });

    handles.timeoutId = setTimeout(run, Math.max(0, delayMs));

    if ("requestIdleCallback" in window) {
      handles.idleId = window.requestIdleCallback(run, {
        timeout: Math.max(delayMs, 2000),
      });
    }

    return cleanup;
  }, [enabled, defer, delayMs, googleAnalyticsId, googleTagManagerId]);

  return null;
}
