"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { disableCouponAction } from "./actions";

export function DisableCouponButton({ couponId }: { couponId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!window.confirm("Bu hediye çekini pasifleştirmek istiyor musunuz?")) return;
        startTransition(async () => {
          const result = await disableCouponAction(couponId);
          if (!result.error) router.refresh();
        });
      }}
      className="text-sm font-medium text-rose-600 hover:underline disabled:opacity-50"
    >
      {pending ? "…" : "Pasifleştir"}
    </button>
  );
}
