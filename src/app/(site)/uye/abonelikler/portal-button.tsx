"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

export function StripePortalButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setPending(true);
          setError(null);
          void fetch("/api/stripe/portal", { method: "POST" })
            .then(async (res) => {
              const data = (await res.json().catch(() => null)) as {
                url?: string;
                error?: string;
              } | null;
              if (!res.ok || !data?.url) {
                throw new Error(data?.error || "Portal açılamadı.");
              }
              window.location.href = data.url;
            })
            .catch((err) => {
              setError(err instanceof Error ? err.message : "Portal açılamadı.");
            })
            .finally(() => setPending(false));
        }}
        className="inline-flex items-center gap-2 rounded-full border border-site-border px-4 py-2.5 text-sm font-semibold text-site-fg hover:bg-site-surface disabled:opacity-70"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Aboneliği Yönet
      </button>
      {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
