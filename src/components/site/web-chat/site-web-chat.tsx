"use client";

import { FileText, Minus, Paperclip, Send, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { WebChatGlyph } from "@/modules/support-chat/components/web-chat-icon";
import type { WebChatIcon, WebChatPosition } from "@/modules/support-chat/web-chat-appearance";

type WebChatMedia = {
  kind: "image" | "video" | "audio" | "document";
  src: string;
  fileName: string;
  mime: string;
};

type WebChatMessage = {
  id: string;
  direction: "IN" | "OUT";
  body: string;
  sentAt: string;
  media?: WebChatMedia[];
};

type WebChatSession = {
  enabled: boolean;
  visitorId: string;
  name: string;
  email: string;
  phone: string;
  loggedIn: boolean;
  known: boolean;
  askContact: boolean;
  siteName: string;
  hours: string;
  online: boolean;
  greeting: string;
  teaserEnabled: boolean;
  teaserText: string;
  showAgentName: boolean;
  icon: WebChatIcon;
  position: WebChatPosition;
  attachmentsEnabled: boolean;
  hasConversation: boolean;
  unread: number;
};

type KnownCustomer = {
  name: string;
  email: string;
  phone: string;
  known: boolean;
};

const SEEN_KEY = "sc_web_seen_at";
const TEASER_KEY = "sc_web_teaser_off";
const PROFILE_KEY = "sc_web_profile";

function readSeenAt() {
  try {
    return localStorage.getItem(SEEN_KEY);
  } catch {
    return null;
  }
}

function writeSeenAt(value: string) {
  try {
    localStorage.setItem(SEEN_KEY, value);
  } catch {
    /* ignore */
  }
}

function readProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return { name: "", email: "", phone: "" };
    const parsed = JSON.parse(raw) as { name?: string; email?: string; phone?: string };
    return {
      name: parsed.name?.trim() || "",
      email: parsed.email?.trim() || "",
      phone: parsed.phone?.trim() || "",
    };
  } catch {
    return { name: "", email: "", phone: "" };
  }
}

function writeProfile(profile: { name: string; email: string; phone: string }) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    /* ignore */
  }
}

function formatTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_MEDIA_BYTES = 16 * 1024 * 1024;

function mediaKindFromFile(file: File): WebChatMedia["kind"] {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "document";
}

function maxBytesForKind(kind: WebChatMedia["kind"]) {
  switch (kind) {
    case "image":
      return MAX_IMAGE_BYTES;
    case "video":
    case "audio":
    case "document":
      return MAX_MEDIA_BYTES;
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

function visibleMessageBody(message: WebChatMessage) {
  const media = message.media ?? [];
  const body = message.body.trim();
  if (!body || body === "(medya)") return "";
  if (media[0] && (body === "Görsel" || body === "Video" || body === "Ses" || body === "Dosya")) {
    return "";
  }
  return body;
}

function WebChatBubbleMedia({ items, outgoing }: { items: WebChatMedia[]; outgoing: boolean }) {
  if (items.length === 0) return null;
  const tone = outgoing ? "text-white/90" : "text-slate-700";
  return (
    <div className="space-y-2">
      {items.map((item) => {
        switch (item.kind) {
          case "image":
            return (
              <a key={item.src} href={item.src} target="_blank" rel="noopener noreferrer" className="block">
                <img
                  src={item.src}
                  alt={item.fileName || "Görsel"}
                  className="max-h-48 max-w-full rounded-xl object-contain"
                />
              </a>
            );
          case "video":
            return (
              <video key={item.src} src={item.src} controls className="max-h-48 w-full rounded-xl bg-black" />
            );
          case "audio":
            return <audio key={item.src} src={item.src} controls className="w-full" />;
          case "document":
            return (
              <a
                key={item.src}
                href={item.src}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex max-w-full items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-medium ${
                  outgoing ? "bg-white/15 text-white" : "bg-slate-100 text-slate-700"
                }`}
              >
                <FileText className="h-4 w-4 shrink-0" />
                <span className={`min-w-0 truncate ${tone}`}>{item.fileName || "Dosya"}</span>
              </a>
            );
          default: {
            const _exhaustive: never = item.kind;
            return _exhaustive;
          }
        }
      })}
    </div>
  );
}

export function SiteWebChat({
  siteName,
  hours,
  knownCustomer = null,
}: {
  siteName: string;
  hours: string;
  knownCustomer?: KnownCustomer | null;
}) {
  const [session, setSession] = useState<WebChatSession | null>(null);
  const [open, setOpen] = useState(false);
  const [teaser, setTeaser] = useState(false);
  const [messages, setMessages] = useState<WebChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [name, setName] = useState(knownCustomer?.name ?? "");
  const [email, setEmail] = useState(knownCustomer?.email ?? "");
  const [phone, setPhone] = useState(knownCustomer?.phone ?? "");
  const [started, setStarted] = useState(
    Boolean(
      knownCustomer?.known ||
        (knownCustomer &&
          (knownCustomer.name.trim().length >= 2 || knownCustomer.email || knownCustomer.phone)),
    ),
  );
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (knownCustomer?.known) return;
    const stored = readProfile();
    setName((current) => current || stored.name);
    setEmail((current) => current || stored.email);
    setPhone((current) => current || stored.phone);
    if (stored.name.length >= 2) setStarted(true);
  }, [knownCustomer?.known]);

  useEffect(() => {
    let cancelled = false;
    async function loadSession() {
      try {
        const seenAt = readSeenAt();
        const query = seenAt ? `?seenAt=${encodeURIComponent(seenAt)}` : "";
        const response = await fetch(`/api/support-chat/web/session${query}`, { cache: "no-store" });
        const data = (await response.json()) as WebChatSession | { error?: string };
        if (cancelled || !("enabled" in data)) return;
        setSession(data);
        setUnread(data.unread);
        if (data.name) setName((current) => current || data.name);
        if (data.email) setEmail((current) => current || data.email);
        if (data.phone) setPhone((current) => current || data.phone);
        if (
          !data.askContact ||
          data.known ||
          data.hasConversation ||
          (data.loggedIn && (data.name || data.email || data.phone))
        ) {
          setStarted(true);
        }
      } catch {
        /* keep launcher hidden until we know */
      }
    }
    void loadSession();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!session?.enabled || !session.teaserEnabled || open) return;
    try {
      if (sessionStorage.getItem(TEASER_KEY) === "1") return;
    } catch {
      return;
    }
    const timer = window.setTimeout(() => setTeaser(true), 12000);
    return () => window.clearTimeout(timer);
  }, [session?.enabled, session?.teaserEnabled, open]);

  useEffect(() => {
    if (!open || !started || !session?.enabled) return;
    let cancelled = false;
    async function loadMessages() {
      if (document.hidden) return;
      try {
        const response = await fetch("/api/support-chat/web/messages", { cache: "no-store" });
        const data = (await response.json()) as { messages?: WebChatMessage[] };
        if (cancelled || !data.messages) return;
        setMessages(data.messages);
        const last = data.messages[data.messages.length - 1];
        if (last) writeSeenAt(last.sentAt);
        setUnread(0);
      } catch {
        /* retry on next tick */
      }
    }
    void loadMessages();
    const timer = window.setInterval(() => {
      void loadMessages();
    }, 3000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [open, started, session?.enabled]);

  useEffect(() => {
    if (!session?.enabled || open) return;
    const timer = window.setInterval(async () => {
      if (document.hidden) return;
      try {
        const seenAt = readSeenAt();
        const query = seenAt ? `?seenAt=${encodeURIComponent(seenAt)}` : "";
        const response = await fetch(`/api/support-chat/web/session${query}`, { cache: "no-store" });
        const data = (await response.json()) as WebChatSession | { error?: string };
        if (!("enabled" in data) || !data.enabled) return;
        setUnread(data.unread);
        if (
          !data.askContact ||
          data.known ||
          data.hasConversation ||
          (data.loggedIn && (data.name || data.email || data.phone))
        ) {
          setStarted(true);
        }
      } catch {
        /* ignore */
      }
    }, 8000);
    return () => window.clearInterval(timer);
  }, [session?.enabled, open]);

  useEffect(() => {
    const thread = threadRef.current;
    if (!thread) return;
    thread.scrollTop = thread.scrollHeight;
  }, [messages, open, started]);

  useEffect(() => {
    if (!pendingFile || !pendingFile.type.startsWith("image/")) {
      setPendingPreview(null);
      return;
    }
    const url = URL.createObjectURL(pendingFile);
    setPendingPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingFile]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function dismissTeaser() {
    setTeaser(false);
    try {
      sessionStorage.setItem(TEASER_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  function openPanel() {
    setOpen(true);
    setTeaser(false);
    setError(null);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function beginChat(event: FormEvent) {
    event.preventDefault();
    const nextName = name.trim();
    if (nextName.length < 2) {
      setError("Adınızı yazın.");
      return;
    }
    writeProfile({ name: nextName, email: email.trim(), phone: phone.trim() });
    setStarted(true);
    setError(null);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function pickFile(file: File | undefined) {
    if (!file) return;
    const kind = mediaKindFromFile(file);
    const max = maxBytesForKind(kind);
    if (file.size > max) {
      setError(
        `${kind === "image" ? "Görsel" : "Dosya"} en fazla ${Math.round(max / 1024 / 1024)} MB olabilir.`,
      );
      return;
    }
    setError(null);
    setPendingFile(file);
  }

  async function send() {
    const text = draft.trim();
    if ((!text && !pendingFile) || sending) return;
    setSending(true);
    setError(null);
    writeProfile({ name: name.trim(), email: email.trim(), phone: phone.trim() });
    try {
      const form = new FormData();
      form.set("name", name);
      form.set("email", email);
      form.set("phone", phone);
      form.set("body", text);
      if (pendingFile) form.set("file", pendingFile);
      const response = await fetch("/api/support-chat/web/messages", {
        method: "POST",
        body: form,
      });
      const data = (await response.json()) as { messages?: WebChatMessage[]; error?: string };
      if (!response.ok || !data.messages) {
        setError(data.error || "Mesaj gönderilemedi.");
        return;
      }
      setDraft("");
      setPendingFile(null);
      setMessages(data.messages);
      const last = data.messages[data.messages.length - 1];
      if (last) writeSeenAt(last.sentAt);
      setUnread(0);
    } catch {
      setError("Bağlantı hatası. Tekrar deneyin.");
    } finally {
      setSending(false);
    }
  }

  if (!session?.enabled) return null;

  const brand = session.showAgentName ? session.siteName || siteName : "Destek";
  const subtitle = session.hours || hours || "Genellikle birkaç dakika içinde yanıtlarız.";
  const side = session.position === "left" ? "left-5" : "right-5";

  return (
    <div className="pointer-events-none fixed inset-0 z-50">
      {open ? (
        <section
          role="dialog"
          aria-label="Destek sohbeti"
          className={`pointer-events-auto absolute inset-0 flex flex-col overflow-hidden bg-[#eef3f8] shadow-2xl sm:inset-auto sm:bottom-24 ${side === "left-5" ? "sm:left-5" : "sm:right-5"} sm:h-[min(620px,calc(100dvh-7rem))] sm:w-[380px] sm:rounded-3xl sm:border sm:border-sky-100`}
        >
          <header className="flex items-start gap-3 bg-site-primary px-4 py-3.5 text-white sm:rounded-t-3xl">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/15">
              <WebChatGlyph icon={session.icon} className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold leading-tight">{brand}</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-white/80">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${session.online ? "bg-emerald-300" : "bg-white/50"}`}
                />
                {subtitle}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="grid h-8 w-8 place-items-center rounded-full text-white/80 hover:bg-white/10 hover:text-white"
              aria-label="Sohbeti küçült"
            >
              <Minus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="grid h-8 w-8 place-items-center rounded-full text-white/80 hover:bg-white/10 hover:text-white sm:hidden"
              aria-label="Kapat"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          {!started ? (
            <form onSubmit={beginChat} className="flex min-h-0 flex-1 flex-col px-4 py-4">
              <p className="text-sm leading-6 text-slate-600">{session.greeting}</p>
              <div className="mt-4 space-y-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-500">Adınız</span>
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                    autoComplete="name"
                    className="w-full rounded-xl border border-sky-100 bg-white px-3 py-2.5 text-sm outline-none ring-site-primary/30 focus:ring-2"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-500">E-posta (isteğe bağlı)</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    className="w-full rounded-xl border border-sky-100 bg-white px-3 py-2.5 text-sm outline-none ring-site-primary/30 focus:ring-2"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-500">Telefon (isteğe bağlı)</span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    autoComplete="tel"
                    className="w-full rounded-xl border border-sky-100 bg-white px-3 py-2.5 text-sm outline-none ring-site-primary/30 focus:ring-2"
                  />
                </label>
              </div>
              {error ? <p className="mt-3 text-xs text-rose-600">{error}</p> : null}
              <button
                type="submit"
                className="mt-auto rounded-xl bg-site-primary px-4 py-3 text-sm font-semibold text-white hover:opacity-95"
              >
                Sohbete başla
              </button>
            </form>
          ) : (
            <>
              <div ref={threadRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
                <div className="rounded-2xl bg-white px-3.5 py-3 text-sm leading-6 text-slate-600 shadow-sm">
                  {name.trim().split(/\s+/)[0] && (session.known || knownCustomer?.known)
                    ? session.greeting.replace(/^Merhaba!/, `Merhaba ${name.trim().split(/\s+/)[0]}!`)
                    : session.greeting}
                  {session.known || knownCustomer?.known ? (
                    <span className="mt-1.5 block text-[11px] text-slate-400">
                      Kayıtlı hesabınızla yazıyorsunuz
                    </span>
                  ) : null}
                </div>
                {messages.map((message) => {
                  const media = message.media ?? [];
                  const text = visibleMessageBody(message);
                  const mine = message.direction === "IN";
                  return (
                    <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-6 shadow-sm ${
                          mine
                            ? "rounded-br-md bg-site-primary text-white"
                            : "rounded-bl-md bg-white text-slate-800"
                        }`}
                      >
                        <WebChatBubbleMedia items={media} outgoing={mine} />
                        {text ? (
                          <p className={media.length > 0 ? "mt-1.5 whitespace-pre-wrap" : "whitespace-pre-wrap"}>
                            {text}
                          </p>
                        ) : null}
                        <p className={`mt-1 text-[10px] ${mine ? "text-white/70" : "text-slate-400"}`}>
                          {formatTime(message.sentAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="border-t border-sky-100 bg-[#eef3f8] px-3 pt-2 pb-3">
                {pendingFile ? (
                  <div className="mb-2 flex items-center gap-2 rounded-xl border border-sky-100 bg-white px-2.5 py-2">
                    {pendingPreview ? (
                      <img src={pendingPreview} alt="" className="h-10 w-10 rounded-md object-cover" />
                    ) : (
                      <span className="grid h-10 w-10 place-items-center rounded-md bg-slate-100 text-slate-500">
                        <FileText className="h-4 w-4" />
                      </span>
                    )}
                    <span className="min-w-0 flex-1 truncate text-xs text-slate-600">{pendingFile.name}</span>
                    <button
                      type="button"
                      onClick={() => setPendingFile(null)}
                      className="grid h-7 w-7 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      aria-label="Dosyayı kaldır"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : null}
                <div className="flex items-end gap-2">
                  {session.attachmentsEnabled ? (
                    <>
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip"
                        className="hidden"
                        onChange={(event) => {
                          pickFile(event.target.files?.[0]);
                          event.target.value = "";
                        }}
                      />
                      <button
                        type="button"
                        disabled={sending}
                        onClick={() => fileRef.current?.click()}
                        title="Dosya ekle"
                        className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-sky-200 bg-white text-slate-500 hover:bg-sky-50 disabled:opacity-40"
                      >
                        <Paperclip className="h-4 w-4" />
                      </button>
                    </>
                  ) : null}
                  <div className="min-w-0 flex-1 rounded-2xl border border-sky-200 bg-white px-3 py-2">
                    <textarea
                      ref={inputRef}
                      value={draft}
                      rows={1}
                      onChange={(event) => setDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          void send();
                        }
                      }}
                      placeholder={session.attachmentsEnabled ? "Mesaj yazın veya dosya ekleyin..." : "Bir mesaj yaz..."}
                      disabled={sending}
                      className="max-h-28 min-h-[40px] w-full resize-none bg-transparent text-sm outline-none placeholder:text-slate-400"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={sending || (!draft.trim() && !pendingFile)}
                    onClick={() => void send()}
                    title="Gönder"
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#8eb4e6] text-white hover:bg-[#7aa6dc] disabled:opacity-40"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
                {error ? <p className="mt-1.5 text-center text-[11px] text-rose-600">{error}</p> : null}
                <p className="mt-1.5 text-center text-[11px] text-slate-400">
                  Enter = gönder · Shift+Enter = yeni satır
                </p>
              </div>
            </>
          )}
        </section>
      ) : null}

      {!open && teaser && session.teaserEnabled ? (
        <div className={`pointer-events-auto absolute bottom-24 ${side} w-[min(280px,calc(100vw-5.5rem))] rounded-2xl bg-white px-3.5 py-3 text-sm shadow-xl shadow-slate-900/10 ring-1 ring-slate-200/80`}>
          <button
            type="button"
            onClick={dismissTeaser}
            className="absolute top-2 right-2 text-slate-400 hover:text-slate-600"
            aria-label="Kapat"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={openPanel} className="pr-5 text-left text-slate-700">
            {session.teaserText}
          </button>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openPanel())}
        aria-expanded={open}
        aria-label={open ? "Sohbeti kapat" : unread > 0 ? `Destek sohbeti, ${unread} yeni mesaj` : "Destek sohbeti"}
        className={`pointer-events-auto absolute bottom-5 ${side} grid h-14 w-14 place-items-center rounded-full bg-site-primary text-white shadow-lg shadow-violet-500/30 transition hover:-translate-y-0.5 ${
          open ? "hidden sm:grid" : ""
        } ${unread > 0 ? "motion-safe:animate-pulse" : ""}`}
      >
        {open ? <X className="h-6 w-6" /> : <WebChatGlyph icon={session.icon} className="h-6 w-6" />}
        {!open && unread > 0 ? (
          <span className="absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[11px] font-semibold">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>
    </div>
  );
}
