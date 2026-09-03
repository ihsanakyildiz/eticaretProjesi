"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useCan } from "@/components/admin/admin-permissions";
import { assignStockLocationAction } from "./locations/actions";

export type LocationOption = {
  id: string;
  code: string;
  hint: string;
};

export function StockLocationSelect({
  warehouseId,
  variantId,
  locationId,
  locations,
  compact,
  onAssigned,
}: {
  warehouseId: string;
  variantId: string;
  locationId: string | null;
  locations: LocationOption[];
  compact?: boolean;
  onAssigned?: (locationId: string | null) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const canAssign = useCan("inventory", "update");
  const selected = locations.find((row) => row.id === locationId);

  if (locations.length === 0) {
    return <span className="text-xs text-slate-400">Raf yok</span>;
  }

  if (!canAssign) {
    return (
      <span className="font-mono text-xs text-slate-600">
        {selected ? selected.code : "—"}
      </span>
    );
  }

  return (
    <select
      value={locationId ?? ""}
      disabled={isPending}
      onChange={(event) => {
        const next = event.target.value || null;
        startTransition(async () => {
          const result = await assignStockLocationAction({ warehouseId, variantId, locationId: next });
          if (result.ok) onAssigned?.(next);
          router.refresh();
        });
      }}
      className={
        compact
          ? "max-w-[9rem] rounded-md border border-[#e9ebec] bg-white px-2 py-1 font-mono text-xs"
          : "w-full rounded-md border border-[#e9ebec] bg-white px-3 py-2 font-mono text-sm"
      }
    >
      <option value="">Raf seçin</option>
      {locations.map((row) => (
        <option key={row.id} value={row.id}>
          {row.code}
          {row.hint ? ` · ${row.hint}` : ""}
        </option>
      ))}
    </select>
  );
}
