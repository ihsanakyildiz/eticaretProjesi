"use client";

import { Calendar, MessageSquareText, Paperclip, Quote, Send, Smile, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { SupportChatVoiceButton } from "@/modules/support-chat/components/support-chat-voice-button";
import {
  supportChatKindFromFile,
  supportChatMediaKindLabel,
  type SupportChatFolder,
  type SupportChatQuote,
  type SupportChatReplyRow,
} from "@/modules/support-chat/kinds";

const COMPOSER_EMOJIS = [
  "😀",
  "😊",
  "🙂",
  "😉",
  "😍",
  "😂",
  "🙏",
  "👍",
  "👎",
  "❤️",
  "✅",
  "❌",
  "👋",
  "🎉",
  "🔥",
  "💯",
  "📦",
  "🚚",
  "💬",
  "📞",
] as const;

type ComposerMenu = "replies" | "emoji" | null;

function insertAtCursor(value: string, insert: string, start: number, end: number) {
  return `${value.slice(0, start)}${insert}${value.slice(end)}`;
}

function formatComposerDate(isoDate: string) {
  const parsed = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return parsed.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function SupportChatComposer({
  draft,
  onDraftChange,
  quoting,
  onClearQuote,
  pendingFile,
  pendingPreview,
  pendingVoice,
  onClearFile,
  replies,
  canCompose,
  sending,
  folder,
  sendError,
  onSend,
  onPickFile,
  onVoiceRecorded,
  onVoiceError,
}: {
  draft: string;
  onDraftChange: (value: string) => void;
  quoting: SupportChatQuote | null;
  onClearQuote: () => void;
  pendingFile: File | null;
  pendingPreview: string | null;
  pendingVoice: boolean;
  onClearFile: () => void;
  replies: SupportChatReplyRow[];
  canCompose: boolean;
  sending: boolean;
  folder: SupportChatFolder;
  sendError: string | null;
  onSend: () => void;
  onPickFile: (file: File | undefined) => void;
  onVoiceRecorded: (file: File) => void;
  onVoiceError: (message: string) => void;
}) {
  const [menu, setMenu] = useState<ComposerMenu>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const toolsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!toolsRef.current?.contains(event.target as Node)) setMenu(null);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function insertText(text: string) {
    const area = textareaRef.current;
    const start = area?.selectionStart ?? draft.length;
    const end = area?.selectionEnd ?? draft.length;
    const next = insertAtCursor(draft, text, start, end);
    onDraftChange(next);
    requestAnimationFrame(() => {
      area?.focus();
      const cursor = start + text.length;
      area?.setSelectionRange(cursor, cursor);
    });
  }

  function toggleMenu(next: Exclude<ComposerMenu, null>) {
    setMenu((current) => (current === next ? null : next));
  }

  const disabled = !canCompose || sending;
  const toolClass =
    "grid h-8 w-8 place-items-center rounded-lg text-[#6b858c] hover:bg-[#eef3f6] hover:text-[#3d6b75] disabled:opacity-40";

  return (
    <div className="border-t border-[#e9ebec] bg-[#eef3f8] px-4 pt-3 pb-2">
      <div className="flex items-center gap-2.5">
        <div className="min-w-0 flex-1 rounded-2xl border border-[#c5d8ef] bg-white px-4 pt-3 pb-2 shadow-[0_1px_2px_rgba(64,81,137,0.04)]">
          {quoting ? (
            <div className="mb-2 flex items-start gap-2 rounded-xl border border-[#e9ebec] bg-[#f8fafc] px-3 py-2">
              <Quote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#405189]" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold text-[#405189]">Alıntılanan mesaj</p>
                <p className="line-clamp-2 text-xs text-slate-600">{quoting.body}</p>
              </div>
              <button
                type="button"
                onClick={onClearQuote}
                className="text-slate-400 hover:text-slate-600"
                title="Alıntıyı kaldır"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : null}
          {pendingFile ? (
            <div className="mb-2 flex items-center gap-2 rounded-xl border border-[#e9ebec] bg-[#f8fafc] px-3 py-2">
              {pendingFile.type.startsWith("image/") && pendingPreview ? (
                <img src={pendingPreview} alt="" className="h-10 w-10 rounded object-cover" />
              ) : pendingFile.type.startsWith("audio/") && pendingPreview ? (
                <audio src={pendingPreview} controls className="h-8 w-40 shrink-0" />
              ) : (
                <Paperclip className="h-4 w-4 text-[#405189]" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-slate-700">
                  {pendingVoice ? "Sesli mesaj" : pendingFile.name}
                </p>
                <p className="text-[11px] text-slate-400">
                  {supportChatMediaKindLabel(supportChatKindFromFile(pendingFile.type, pendingFile.name))}
                </p>
              </div>
              <button
                type="button"
                onClick={onClearFile}
                className="text-slate-400 hover:text-slate-600"
                title="Dosyayı kaldır"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : null}
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                onSend();
              }
            }}
            placeholder={folder === "TRASH" ? "Çöp kutusundan geri alın" : "Bir mesaj yaz..."}
            rows={2}
            disabled={disabled}
            className="min-h-[44px] w-full resize-none border-0 bg-transparent p-0 text-sm text-slate-800 outline-none placeholder:text-slate-400 disabled:bg-transparent"
          />
          <div ref={toolsRef} className="relative mt-2 flex items-center gap-0.5">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*,audio/*"
              className="hidden"
              onChange={(event) => {
                onPickFile(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
            <input
              ref={dateInputRef}
              type="date"
              className="sr-only"
              onChange={(event) => {
                if (!event.target.value) return;
                insertText(formatComposerDate(event.target.value));
                event.target.value = "";
              }}
            />
            <button
              type="button"
              disabled={disabled}
              onClick={() => fileInputRef.current?.click()}
              title="Görsel, video veya ses ekle"
              className={toolClass}
            >
              <Paperclip className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={disabled || replies.length === 0}
              onClick={() => toggleMenu("replies")}
              title={replies.length === 0 ? "Hazır cevap yok" : "Hazır cevaplar"}
              className={`${toolClass} ${menu === "replies" ? "bg-[#eef3f6] text-[#3d6b75]" : ""}`}
            >
              <MessageSquareText className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                const input = dateInputRef.current;
                if (!input) return;
                if (typeof input.showPicker === "function") input.showPicker();
                else input.click();
              }}
              title="Tarih ekle"
              className={toolClass}
            >
              <Calendar className="h-4 w-4" />
            </button>
            <SupportChatVoiceButton
              variant="toolbar"
              disabled={disabled}
              onRecorded={onVoiceRecorded}
              onError={onVoiceError}
            />
            <button
              type="button"
              disabled={disabled}
              onClick={() => toggleMenu("emoji")}
              title="Emoji"
              className={`${toolClass} ${menu === "emoji" ? "bg-[#eef3f6] text-[#3d6b75]" : ""}`}
            >
              <Smile className="h-4 w-4" />
            </button>
            {menu === "replies" ? (
              <div className="absolute bottom-10 left-0 z-20 w-64 overflow-hidden rounded-xl border border-[#e9ebec] bg-white py-1 shadow-lg">
                {replies.map((reply) => (
                  <button
                    key={reply.id}
                    type="button"
                    onClick={() => {
                      onDraftChange(reply.body);
                      setMenu(null);
                      textareaRef.current?.focus();
                    }}
                    className="block w-full truncate px-3 py-2 text-left text-xs text-slate-700 hover:bg-[#f4f7fb]"
                  >
                    {reply.title}
                  </button>
                ))}
              </div>
            ) : null}
            {menu === "emoji" ? (
              <div className="absolute bottom-10 left-0 z-20 grid w-56 grid-cols-5 gap-0.5 rounded-xl border border-[#e9ebec] bg-white p-2 shadow-lg">
                {COMPOSER_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => insertText(emoji)}
                    className="grid h-8 place-items-center rounded-md text-base hover:bg-[#f4f7fb]"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          disabled={disabled || (!draft.trim() && !pendingFile)}
          onClick={onSend}
          title="Gönder"
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#8eb4e6] text-white shadow-sm hover:bg-[#7aa6dc] disabled:opacity-40"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
      <p className="mt-2 text-center text-[11px] text-slate-400">
        Enter = gönder · Shift+Enter = yeni satır
      </p>
      {sendError ? <p className="mt-1 text-center text-xs text-rose-600">{sendError}</p> : null}
    </div>
  );
}
