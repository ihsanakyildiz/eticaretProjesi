"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";

export function ProjectQuoteForm({ projectTitle }: { projectTitle: string }) {
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  return (
    <div className="rounded-3xl border border-site-border bg-site-card p-5 shadow-sm">
      <h3 className="font-display text-lg font-semibold text-site-fg">
        Teklif Alın
      </h3>
      <p className="mt-1 text-xs text-site-muted">
        {projectTitle} için kısa bir mesaj bırakın.
      </p>

      {sent ? (
        <div className="mt-4 flex items-start gap-2 rounded-2xl bg-emerald-50 px-3 py-3 text-sm text-emerald-700">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          Mesajınız alındı. En kısa sürede dönüş yapacağız.
        </div>
      ) : (
        <form
          className="mt-4 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            setPending(true);
            window.setTimeout(() => {
              setPending(false);
              setSent(true);
            }, 600);
          }}
        >
          <input
            name="name"
            required
            placeholder="Adınız"
            className="w-full rounded-xl border border-site-border bg-white px-3 py-2.5 text-sm outline-none focus:border-site-primary"
          />
          <input
            name="email"
            type="email"
            required
            placeholder="E-posta"
            className="w-full rounded-xl border border-site-border bg-white px-3 py-2.5 text-sm outline-none focus:border-site-primary"
          />
          <textarea
            name="message"
            required
            rows={4}
            placeholder="Mesajınız"
            className="w-full resize-y rounded-xl border border-site-border bg-white px-3 py-2.5 text-sm outline-none focus:border-site-primary"
          />
          <button
            type="submit"
            disabled={pending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-site-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-70"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Mesaj Gönder
          </button>
        </form>
      )}
    </div>
  );
}
