"use client";

import { useEffect, useState } from "react";
import { saleCountdownParts } from "@/lib/product-sale";

function toDate(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function useTickingNow(enabled: boolean) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    if (!enabled) {
      setNow(null);
      return;
    }
    const tick = () => setNow(new Date());
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [enabled]);
  return now;
}

function formatCountdown(end: Date, now: Date) {
  const remaining = end.getTime() - now.getTime();
  if (remaining <= 0) return null;
  const parts = saleCountdownParts(remaining);
  const pad = (value: number) => String(value).padStart(2, "0");
  return {
    ...parts,
    time: `${pad(parts.hours)}:${pad(parts.minutes)}:${pad(parts.seconds)}`,
  };
}

export function SaleCountdown({
  endsAt,
  compact = false,
}: {
  endsAt: Date | string | null | undefined;
  compact?: boolean;
}) {
  const end = toDate(endsAt);
  const now = useTickingNow(Boolean(end));
  if (!end) return null;
  const countdown = now ? formatCountdown(end, now) : null;
  if (now && !countdown) return null;

  if (compact) {
    return (
      <p className="mt-1 min-h-4 text-[11px] font-semibold text-rose-600">
        {countdown ? (countdown.days > 0 ? `${countdown.days}g ${countdown.time}` : countdown.time) : "\u00a0"}
      </p>
    );
  }

  return (
    <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5">
      <p className="text-[11px] font-semibold tracking-wide text-rose-700 uppercase">
        Kampanya bitimine
      </p>
      <div className="mt-1.5 flex flex-wrap items-baseline gap-2 text-rose-700">
        {countdown && countdown.days > 0 ? (
          <span className="text-lg font-bold">
            {countdown.days}
            <span className="ml-0.5 text-xs font-semibold">gün</span>
          </span>
        ) : null}
        <span className="font-mono text-lg font-bold tabular-nums">
          {countdown ? countdown.time : "--:--:--"}
        </span>
      </div>
    </div>
  );
}
