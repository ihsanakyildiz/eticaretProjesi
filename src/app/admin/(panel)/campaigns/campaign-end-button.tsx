"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { endCampaignAction } from "./actions";

export function CampaignEndButton({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!window.confirm("Kampanya durdurulsun ve ürün fiyatları geri alınsın mı?")) return;
          setError(null);
          startTransition(async () => {
            const result = await endCampaignAction(campaignId);
            if (result.error) {
              setError(result.error);
              return;
            }
            router.refresh();
          });
        }}
        className="rounded-md border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
      >
        {pending ? <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> : null}
        Kampanyayı bitir
      </button>
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
