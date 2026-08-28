import { SiteLink } from "@/components/site/site-link";
import { ArrowRight } from "lucide-react";

export function HomeCta() {
  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-site-primary px-6 py-14 text-center text-white shadow-2xl shadow-violet-500/30 sm:px-10">
        <div className="pointer-events-none absolute inset-0 opacity-30">
          <div className="absolute -top-20 -left-10 h-64 w-64 rounded-full bg-fuchsia-400 blur-3xl" />
          <div className="absolute -right-10 -bottom-24 h-72 w-72 rounded-full bg-indigo-800 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-2xl">
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Güncel kalın. Hemen abone olun.
          </h2>
          <p className="mt-3 text-white/80">
            Yeni projeler, ipuçları ve stüdyo güncellemeleri için bültenimize katılın.
          </p>
          <form className="mt-8 flex flex-col gap-3 sm:flex-row sm:rounded-full sm:bg-white sm:p-1.5">
            <input
              type="email"
              required
              placeholder="E-posta adresiniz"
              className="w-full rounded-full border-0 bg-white px-5 py-3.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 sm:bg-transparent"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-800 sm:bg-site-primary sm:hover:brightness-110"
            >
              Abone Ol
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
          <p className="mt-4 text-xs text-white/70">
            İstediğiniz zaman ayrılabilirsiniz.{" "}
            <SiteLink href="/gizlilik" className="underline underline-offset-2">
              Gizlilik politikası
            </SiteLink>
          </p>
        </div>
      </div>
    </section>
  );
}
