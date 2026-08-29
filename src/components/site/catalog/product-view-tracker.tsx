"use client";

import { useEffect } from "react";
import { recordProductViewAction } from "@/app/(site)/urunler/actions";
import { RECENTLY_VIEWED_KEY, RECENTLY_VIEWED_MAX } from "@/lib/recently-viewed";

export function ProductViewTracker({ productId }: { productId: string }) {
  useEffect(() => {
    void recordProductViewAction(productId);
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
  }, [productId]);

  return null;
}
