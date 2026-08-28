"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";

type PricingPurchaseButtonProps = {
  planId: string;
  interval: "monthly" | "yearly";
  label: string;
  featured?: boolean;
  enabled: boolean;
  className?: string;
};

export function PricingPurchaseButton({
  planId,
  interval,
  label,
  featured,
  enabled,
  className,
}: PricingPurchaseButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!enabled) return null;

  return (
    <div className="contents">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setPending(true);
          setError(null);
          void fetch("/api/stripe/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              pricingPlanId: planId,
              interval: interval === "yearly" ? "YEARLY" : "MONTHLY",
            }),
          })
            .then(async (res) => {
              const data = (await res.json().catch(() => null)) as {
                url?: string;
                error?: string;
                loginUrl?: string;
              } | null;
              if (res.status === 401 && data?.loginUrl) {
                router.push(data.loginUrl);
                return;
              }
              if (!res.ok || !data?.url) {
                throw new Error(data?.error || "Ödeme başlatılamadı.");
              }
              window.location.href = data.url;
            })
            .catch((err) => {
              setError(err instanceof Error ? err.message : "Ödeme başlatılamadı.");
            })
            .finally(() => setPending(false));
        }}
        className={
          className ||
          `inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold transition disabled:opacity-70 ${
            featured
              ? "bg-white text-site-primary hover:bg-violet-50"
              : "border border-site-fg/20 text-site-fg hover:border-site-primary hover:text-site-primary"
          }`
        }
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {label}
        <ArrowRight className="h-4 w-4" />
      </button>
      {error ? (
        <p className="basis-full text-center text-xs text-rose-500 sm:col-span-2">
          {error}
        </p>
      ) : null}
    </div>
  );
}
