"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  activateSupportChatLicenseAction,
  deactivateSupportChatLicenseAction,
  issueAndActivateSupportChatLicenseAction,
} from "@/modules/support-chat/actions";
import type { SupportChatLicenseState } from "@/modules/support-chat/kinds";

export function SupportChatLicenseForm({
  state,
  isAdmin,
}: {
  state: SupportChatLicenseState;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [issuedKey, setIssuedKey] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      <div
        className={`rounded-lg border px-4 py-3 text-sm ${
          state.licensed
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : "border-amber-200 bg-amber-50 text-amber-900"
        }`}
      >
        {state.licensed ? (
          <p>
            Modül lisanslı.
            {state.expiresAt
              ? ` Bitiş: ${new Date(state.expiresAt).toLocaleString("tr-TR")}`
              : " Süre sınırsız."}
          </p>
        ) : (
          <p>Lisans yok. Satın alınan anahtarı girmeden gelen kutusu açılmaz.</p>
        )}
      </div>

      <form
        className="space-y-3 rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          setError(null);
          startTransition(async () => {
            const result = await activateSupportChatLicenseAction(form);
            if ("error" in result && result.error) {
              setError(result.error);
              return;
            }
            router.refresh();
          });
        }}
      >
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">Lisans anahtarı</span>
          <textarea
            name="licenseKey"
            required
            rows={3}
            placeholder="IA-SCHAT...."
            className="w-full rounded-md border border-[#e9ebec] px-3 py-2 text-sm outline-none focus:border-[#0ab39c] focus:ring-2 focus:ring-[#0ab39c]/20"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-[#0ab39c] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#099885] disabled:opacity-50"
        >
          {pending ? <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> : null}
          Lisansı etkinleştir
        </button>
      </form>

      {isAdmin ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                const result = await issueAndActivateSupportChatLicenseAction();
                if ("error" in result && result.error) {
                  setError(result.error);
                  return;
                }
                if ("licenseKey" in result) setIssuedKey(result.licenseKey ?? null);
                router.refresh();
              });
            }}
            className="rounded-md border border-[#e9ebec] px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            1 yıllık kurulum lisansı oluştur
          </button>
          {state.licensed ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (!window.confirm("Sohbet modülü durdurulsun mu?")) return;
                setError(null);
                startTransition(async () => {
                  const result = await deactivateSupportChatLicenseAction();
                  if ("error" in result && result.error) {
                    setError(result.error);
                    return;
                  }
                  router.refresh();
                });
              }}
              className="rounded-md border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
            >
              Lisansı durdur
            </button>
          ) : null}
        </div>
      ) : null}

      {issuedKey ? (
        <p className="break-all rounded-md border border-[#e9ebec] bg-slate-50 px-3 py-2 text-xs text-slate-600">
          Üretilen anahtar: {issuedKey}
        </p>
      ) : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
    </div>
  );
}
