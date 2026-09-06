"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, Send, X } from "lucide-react";
import { SupportChatChannelLogo } from "@/modules/support-chat/components/channel-logo";
import {
  listWhatsAppTemplatesAction,
  searchWhatsAppRecipientsAction,
  sendWhatsAppTemplateAction,
} from "@/modules/support-chat/actions";
import {
  normalizeWhatsAppTo,
  whatsappTemplateOptionLabel,
  whatsappTemplateValuesComplete,
  type WhatsAppTemplateView,
} from "@/modules/support-chat/whatsapp-template";

type RecipientHit = {
  conversationId: string | null;
  name: string;
  phone: string;
};

function TemplatePreviewText({
  text,
  template,
  component,
  values,
}: {
  text: string;
  template: WhatsAppTemplateView;
  component: "header" | "body";
  values: Record<string, string>;
}) {
  const parts = text.split(/(\{\{[a-zA-Z0-9_]+\}\})/g);
  return (
    <>
      {parts.map((part, index) => {
        const match = part.match(/^\{\{([a-zA-Z0-9_]+)\}\}$/);
        if (!match) return <span key={`${component}-${index}`}>{part}</span>;
        const slot = match[1] ?? "";
        const variable = template.variables.find(
          (item) => item.component === component && item.slot === slot,
        );
        const filled = variable ? values[variable.id]?.trim() : "";
        if (filled) {
          return (
            <span key={`${component}-${index}`} className="font-semibold text-[#128C7E]">
              {filled}
            </span>
          );
        }
        return (
          <span
            key={`${component}-${index}`}
            className="rounded bg-amber-100 px-0.5 font-semibold text-amber-800"
          >
            {part}
          </span>
        );
      })}
    </>
  );
}

export function WhatsAppTemplateModal({
  open,
  initialRecipient,
  onClose,
  onSent,
}: {
  open: boolean;
  initialRecipient?: { name: string; phone: string } | null;
  onClose: () => void;
  onSent: (conversationId: string) => void;
}) {
  const [templates, setTemplates] = useState<WhatsAppTemplateView[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<RecipientHit[]>([]);
  const [picked, setPicked] = useState<RecipientHit | null>(null);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = templates.find((item) => item.id === templateId) ?? null;
  const phone = normalizeWhatsAppTo(picked?.phone || query);
  const canSend = Boolean(
    selected?.sendable && phone && whatsappTemplateValuesComplete(selected, values) && !sending,
  );

  useEffect(() => {
    if (!open) return;
    const recipient = initialRecipient;
    setError(null);
    setValues({});
    setHits([]);
    setPicked(
      recipient?.phone
        ? { conversationId: null, name: recipient.name, phone: recipient.phone }
        : null,
    );
    setQuery(recipient?.phone || recipient?.name || "");
    setLoading(true);
    void listWhatsAppTemplatesAction().then((result) => {
      setLoading(false);
      if ("error" in result) {
        setError(result.error);
        setTemplates([]);
        return;
      }
      setTemplates(result.templates);
      setTemplateId((current) => current || result.templates[0]?.id || "");
    });
    // Recipient is snapshotted when the modal opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const needle = query.trim();
    if (needle.length < 2 || picked) {
      setHits([]);
      return;
    }
    const timer = window.setTimeout(() => {
      setSearching(true);
      void searchWhatsAppRecipientsAction(needle).then((result) => {
        setSearching(false);
        if ("ok" in result && result.hits) setHits(result.hits);
      });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [open, query, picked]);

  useEffect(() => {
    if (!selected) return;
    setValues((current) => {
      const next: Record<string, string> = {};
      for (const item of selected.variables) {
        next[item.id] = current[item.id] ?? "";
      }
      return next;
    });
  }, [selected]);

  const showHits = useMemo(() => !picked && hits.length > 0, [picked, hits.length]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Kapat"
        className="absolute inset-0 bg-slate-900/40"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="wa-template-title"
        className="relative flex max-h-[min(720px,calc(100dvh-2rem))] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <header className="flex items-start gap-3 border-b border-[#e9ebec] px-5 py-4">
          <SupportChatChannelLogo channel="WHATSAPP" className="h-10 w-10" badge />
          <div className="min-w-0 flex-1">
            <h2 id="wa-template-title" className="text-base font-semibold text-slate-800">
              Template Mesaj Gönder
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">WhatsApp onaylı şablonla mesaj başlat</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Kapat"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
              Alıcı
            </span>
            <span className="relative block">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={picked ? `${picked.name} · ${picked.phone}` : query}
                onChange={(event) => {
                  setPicked(null);
                  setQuery(event.target.value);
                }}
                placeholder="Ad soyad veya tel. numarası (ör: 905449032919)"
                className="w-full rounded-lg border border-slate-300 bg-[#f3f6f9] py-2.5 pr-3 pl-9 text-sm outline-none focus:border-[#25D366] focus:bg-white focus:ring-2 focus:ring-[#25D366]/20"
              />
            </span>
            {showHits ? (
              <ul className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-[#e9ebec] bg-white shadow-sm">
                {hits.map((hit) => (
                  <li key={`${hit.phone}:${hit.conversationId ?? "new"}`}>
                    <button
                      type="button"
                      onClick={() => {
                        setPicked(hit);
                        setQuery(hit.phone);
                        setHits([]);
                      }}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-slate-50"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-slate-800">{hit.name}</span>
                        <span className="block text-xs text-slate-500">{hit.phone}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {searching ? <p className="mt-1 text-[11px] text-slate-400">Aranıyor…</p> : null}
            {phone ? (
              <p className="mt-1 text-[11px] text-slate-500">Gönderilecek numara: {phone}</p>
            ) : query.trim().length >= 6 ? (
              <p className="mt-1 text-[11px] text-amber-700">
                Geçerli bir telefon yazın. Örnek: 905449032919
              </p>
            ) : null}
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
              Template
            </span>
            <select
              value={templateId}
              onChange={(event) => setTemplateId(event.target.value)}
              disabled={loading || templates.length === 0}
              className="w-full rounded-lg border border-slate-300 bg-[#f3f6f9] px-3 py-2.5 text-sm outline-none focus:border-[#25D366] focus:bg-white focus:ring-2 focus:ring-[#25D366]/20"
            >
              {templates.length === 0 ? <option value="">Şablon yok</option> : null}
              {templates.map((item) => (
                <option key={item.id} value={item.id}>
                  {whatsappTemplateOptionLabel(item)}
                </option>
              ))}
            </select>
          </label>

          {loading ? (
            <p className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Şablonlar yükleniyor…
            </p>
          ) : null}

          {selected ? (
            <section className="space-y-3 rounded-xl border border-[#e9ebec] bg-[#f8fafc] p-4">
              <p className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                Önizleme & değişkenler
              </p>
              {selected.headerText ? (
                <div>
                  <p className="mb-1 text-[10px] font-semibold tracking-wide text-[#25D366] uppercase">
                    Başlık
                  </p>
                  <p className="rounded-md border-l-4 border-[#25D366] bg-white px-3 py-2 text-sm font-medium text-slate-800">
                    <TemplatePreviewText
                      text={selected.headerText}
                      template={selected}
                      component="header"
                      values={values}
                    />
                  </p>
                </div>
              ) : null}
              {selected.variables.length > 0 ? (
                <div className="space-y-2.5">
                  {selected.variables.map((item) => (
                    <label key={item.id} className="block">
                      <span className="mb-1 block text-xs font-semibold text-slate-600">{item.label}</span>
                      <input
                        value={values[item.id] ?? ""}
                        onChange={(event) =>
                          setValues((current) => ({ ...current, [item.id]: event.target.value }))
                        }
                        placeholder={item.example || "Değeri yazın"}
                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#25D366] focus:ring-2 focus:ring-[#25D366]/20"
                      />
                      <span className="mt-1 block text-[11px] leading-4 text-slate-500">{item.hint}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">Bu şablonda doldurulacak değişken yok.</p>
              )}
              {selected.bodyText ? (
                <p className="rounded-md border border-[#e9ebec] bg-white px-3 py-2.5 text-sm leading-6 whitespace-pre-wrap text-slate-700">
                  <TemplatePreviewText
                    text={selected.bodyText}
                    template={selected}
                    component="body"
                    values={values}
                  />
                </p>
              ) : null}
              {selected.footerText ? (
                <p className="text-[11px] text-slate-400">{selected.footerText}</p>
              ) : null}
              {!selected.sendable ? (
                <p className="text-xs text-amber-700">{selected.sendableHint}</p>
              ) : null}
            </section>
          ) : null}

          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-[#e9ebec] px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#e9ebec] px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            İptal
          </button>
          <button
            type="button"
            disabled={!canSend}
            onClick={() => {
              if (!selected || !phone) return;
              setSending(true);
              setError(null);
              void sendWhatsAppTemplateAction({
                to: phone,
                customerName: picked?.name || query,
                templateId: selected.id,
                values,
              }).then((result) => {
                setSending(false);
                if ("error" in result) {
                  setError(result.error);
                  return;
                }
                onSent(result.conversationId);
              });
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1ebe5d] disabled:opacity-50"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Gönder
          </button>
        </footer>
      </div>
    </div>
  );
}
