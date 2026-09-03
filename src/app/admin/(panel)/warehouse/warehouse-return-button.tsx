"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Undo2 } from "lucide-react";
import { Can } from "@/components/admin/admin-permissions";
import { returnShippedOrderToReadyAction } from "./actions";

const CONFIRM_TEXT =
  "Kargo çıkışı iptal edilecek. Sipariş tekrar gönderime hazır listesine döner. Paketleme adetleri korunur; yanlış okutulduysa paketleme sayfasından sıfırlayabilirsiniz. Devam edilsin mi?";

export function WarehouseReturnButton({
  orderId,
  after = "pack",
  onReturned,
}: {
  orderId: string;
  after?: "pack" | "stay";
  onReturned?: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <Can resource="warehouse" action="delete">
    <div className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          if (!window.confirm(CONFIRM_TEXT)) return;
          startTransition(async () => {
            const result = await returnShippedOrderToReadyAction({ orderId });
            if (result.error) {
              setError(result.error);
              return;
            }
            setError(null);
            onReturned?.();
            switch (after) {
              case "pack":
                router.push(`/admin/warehouse/${orderId}`);
                router.refresh();
                return;
              case "stay":
                router.refresh();
                return;
              default: {
                const _exhaustive: never = after;
                return _exhaustive;
              }
            }
          });
        }}
        className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-50"
      >
        <Undo2 className="h-3.5 w-3.5" />
        {isPending ? "Geri alınıyor…" : "Gönderime hazırla"}
      </button>
      {error ? <p className="max-w-[16rem] text-right text-[11px] text-rose-600">{error}</p> : null}
    </div>
    </Can>
  );
}
