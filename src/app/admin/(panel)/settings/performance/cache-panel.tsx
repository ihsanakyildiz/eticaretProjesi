"use client";

import { useActionState } from "react";
import { Loader2, RefreshCw, Trash2 } from "lucide-react";
import { cacheAction, type CachePanelState } from "./cache-actions";

const initialState: CachePanelState = {
  success: false,
  message: "",
};

type CachePanelProps = {
  lastClearedLabel?: string | null;
  lastModeLabel?: string | null;
};

export function CachePanel({ lastClearedLabel, lastModeLabel }: CachePanelProps) {
  const [state, formAction, isPending] = useActionState(cacheAction, initialState);

  return (
    <section className="rounded-lg border border-[#e9ebec] bg-white shadow-sm">
      <div className="border-b border-[#e9ebec] px-5 py-4">
        <h2 className="text-base font-semibold text-slate-800">Önbellek Yönetimi</h2>
        <p className="mt-1 text-sm text-slate-500">
          İçerik veya ayar değişikliklerinden sonra siteyi yenilemek ya da sunucu önbelleğini tamamen
          temizlemek için kullanın.
        </p>
      </div>

      <div className="space-y-4 p-5">
        {state.error ? (
          <div
            role="alert"
            className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
          >
            {state.error}
          </div>
        ) : null}

        {state.success ? (
          <div
            role="status"
            className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
          >
            <p className="font-medium">{state.message}</p>
            {state.details?.length ? (
              <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-emerald-700/80">
                {state.details.slice(0, 8).map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        <div className="grid gap-3 rounded-lg bg-[#f3f6f9] p-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
              Son işlem
            </p>
            <p className="mt-1 text-sm font-medium text-slate-700">
              {lastClearedLabel ?? "Henüz önbellek temizliği yapılmadı"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Tür</p>
            <p className="mt-1 text-sm font-medium text-slate-700">{lastModeLabel ?? "—"}</p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <form action={formAction}>
            <input type="hidden" name="mode" value="refresh" />
            <button
              type="submit"
              disabled={isPending}
              className="flex w-full flex-col items-start gap-2 rounded-lg border border-[#e9ebec] bg-white p-4 text-left transition hover:border-[#0ab39c]/40 hover:bg-[#0ab39c]/5 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin text-[#0ab39c]" />
                ) : (
                  <RefreshCw className="h-4 w-4 text-[#0ab39c]" />
                )}
                Önbelleği Yenile
              </span>
              <span className="text-xs leading-relaxed text-slate-500">
                Sayfa ve layout cache’ini revalidate eder. Güvenli ve hızlıdır; günlük kullanım için
                önerilir.
              </span>
            </button>
          </form>

          <form action={formAction}>
            <input type="hidden" name="mode" value="purge" />
            <button
              type="submit"
              disabled={isPending}
              className="flex w-full flex-col items-start gap-2 rounded-lg border border-rose-200 bg-white p-4 text-left transition hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-rose-700">
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin text-rose-600" />
                ) : (
                  <Trash2 className="h-4 w-4 text-rose-600" />
                )}
                Önbelleği Tamamen Temizle
              </span>
              <span className="text-xs leading-relaxed text-slate-500">
                Revalidate + <code className="text-[11px]">.next/cache</code> disk önbelleğini siler.
                Büyük değişikliklerden sonra kullanın.
              </span>
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
