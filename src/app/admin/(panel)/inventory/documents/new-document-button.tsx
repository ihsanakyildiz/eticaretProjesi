"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Can } from "@/components/admin/admin-permissions";
import { createStockDocumentAction } from "../documents/actions";
import type { StockDocumentKindCode } from "@/lib/inventory-labels";

export function NewStockDocumentButton({
  kind,
  warehouseId,
}: {
  kind: StockDocumentKindCode;
  warehouseId?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Can resource="inventory" action="create">
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          startTransition(async () => {
            const result = await createStockDocumentAction({ kind, warehouseId });
            if (result.ok && result.href) router.push(result.href);
            else if (result.error) window.alert(result.error);
          });
        }}
        className="inline-flex items-center justify-center gap-2 rounded-md bg-[#0ab39c] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#099885] disabled:opacity-60"
      >
        <Plus className="h-4 w-4" />
        Yeni belge
      </button>
    </Can>
  );
}
