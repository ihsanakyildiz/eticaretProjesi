"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { suggestUniqueProductBarcodeAction } from "./actions";

export function AutoBarcodeButton({
  onAssigned,
  excludeVariantId,
  disabled,
  className = "",
}: {
  onAssigned: (barcode: string) => void | Promise<void>;
  excludeVariantId?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      disabled={disabled || pending}
      title="Otomatik barkod ata"
      aria-label="Otomatik barkod ata"
      onClick={() => {
        setPending(true);
        void suggestUniqueProductBarcodeAction({ excludeVariantId })
          .then(async (result) => {
            if (result.error || !result.barcode) {
              window.alert(result.error ?? "Barkod üretilemedi.");
              return;
            }
            await onAssigned(result.barcode);
          })
          .catch(() => {
            window.alert("Barkod üretilemedi.");
          })
          .finally(() => setPending(false));
      }}
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#e9ebec] bg-white text-[#405189] hover:bg-slate-50 disabled:opacity-50 ${className}`}
    >
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
    </button>
  );
}
