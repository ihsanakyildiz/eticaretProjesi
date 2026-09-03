"use client";

import { useEffect } from "react";
import { trackProductEvent } from "@/components/site/catalog/catalog-client-api";
import { RECENTLY_VIEWED_KEY, RECENTLY_VIEWED_MAX } from "@/lib/recently-viewed";

export function ProductViewTracker({
  productId,
  recordView = true,
}: {
  productId: string;
  recordView?: boolean;
}) {
  useEffect(() => {
    if (recordView) {
      trackProductEvent(productId, "view");
    }
    try {
      const raw = window.localStorage.getItem(RECENTLY_VIEWED_KEY);
      const parsed = raw ? (JSON.parse(raw) as unknown) : [];
      const current = Array.isArray(parsed)
        ? parsed.map((item) => String(item)).filter(Boolean)
        : [];
      const next = [productId, ...current.filter((id) => id !== productId)].slice(
        0,
        RECENTLY_VIEWED_MAX,
      );
      window.localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(next));
    } catch {
      window.localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify([productId]));
    }
  }, [productId, recordView]);

  return null;
}
