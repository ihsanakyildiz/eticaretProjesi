"use client";

import { Download, ImageIcon, Paperclip } from "lucide-react";
import {
  avatarTone,
  formatMailDate,
  initialsFromName,
  type MailListItem,
} from "@/lib/mail";
import type { MailAttachmentView } from "@/lib/mail-attachments";

type MailThreadPanelProps = {
  thread: MailListItem[];
  attachments: MailAttachmentView[];
  selectedId: string | null;
};

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function MessageAttachments({
  items,
}: {
  items: MailAttachmentView[];
}) {
  if (items.length === 0) return null;

  const inlineImages = items.filter(
    (item) => item.isInline && item.mimeType.startsWith("image/"),
  );
  const files = items.filter((item) => !item.isInline || !item.mimeType.startsWith("image/"));

  return (
    <div className="mt-4 space-y-3 border-t border-[#eef0f2] pt-4">
      {inlineImages.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {inlineImages.map((item) => (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block overflow-hidden rounded-md border border-[#e9ebec] bg-slate-50"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.url}
                alt={item.filename}
                className="max-h-72 w-full object-contain"
              />
            </a>
          ))}
        </div>
      ) : null}

      {files.length > 0 ? (
        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <Paperclip className="h-3.5 w-3.5" />
            Ekler
          </p>
          <div className="flex flex-wrap gap-2">
            {files.map((item) => (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                download={item.filename}
                className="inline-flex items-center gap-2 rounded-md border border-[#e9ebec] bg-[#f8f9fb] px-3 py-2 text-xs text-slate-700 transition hover:bg-white"
              >
                {item.mimeType.startsWith("image/") ? (
                  <ImageIcon className="h-3.5 w-3.5 text-[#3577f1]" />
                ) : (
                  <Download className="h-3.5 w-3.5 text-[#3577f1]" />
                )}
                <span className="max-w-[180px] truncate">{item.filename}</span>
                <span className="text-slate-400">{formatFileSize(item.size)}</span>
              </a>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MessageBody({ message }: { message: MailListItem }) {
  if (message.bodyHtml) {
    return (
      <div
        className="prose prose-sm max-w-none text-slate-700 [&_img]:max-h-96 [&_img]:rounded-md [&_img]:border [&_img]:border-[#e9ebec]"
        dangerouslySetInnerHTML={{ __html: message.bodyHtml }}
      />
    );
  }

  return (
    <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-700">
      {message.bodyText || message.preview}
    </pre>
  );
}

export function MailThreadPanel({
  thread,
  attachments,
  selectedId,
}: MailThreadPanelProps) {
  if (thread.length === 0) return null;

  const subject = thread[0]?.subject ?? "Mesaj";
  const attachmentsByMessage = new Map<string, MailAttachmentView[]>();
  for (const attachment of attachments) {
    const list = attachmentsByMessage.get(attachment.messageId) ?? [];
    list.push(attachment);
    attachmentsByMessage.set(attachment.messageId, list);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-[#e9ebec] bg-white px-5 py-4 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">{subject}</h3>
        <p className="mt-1 text-xs text-slate-400">
          {thread.length} mesajlık yazışma
        </p>
      </div>

      {thread.map((message, index) => {
        const isSelected = selectedId === message.id;
        const messageAttachments = attachmentsByMessage.get(message.id) ?? [];
        const isSent = message.folder === "SENT";

        return (
          <article
            key={message.id}
            id={`mail-message-${message.id}`}
            className={`rounded-lg border bg-white p-5 shadow-sm transition ${
              isSelected
                ? "border-[#3577f1]/40 ring-2 ring-[#3577f1]/10"
                : "border-[#e9ebec]"
            }`}
          >
            <div className="flex items-start gap-3">
              <span
                className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${avatarTone(
                  message.fromEmail,
                )}`}
              >
                {initialsFromName(message.fromName, message.fromEmail)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {message.fromName}
                      {isSent ? (
                        <span className="ml-2 rounded-full bg-[#3577f1]/10 px-2 py-0.5 text-[10px] font-medium text-[#3577f1]">
                          Gönderildi
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-slate-500">{message.fromEmail}</p>
                  </div>
                  <p className="text-xs text-slate-400">
                    {formatMailDate(message.receivedAt)}
                  </p>
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  Kime: {message.toEmail}
                  {message.label ? ` · Etiket: ${message.label}` : ""}
                </p>
              </div>
            </div>

            <div className="mt-4 border-t border-[#eef0f2] pt-4">
              <MessageBody message={message} />
              <MessageAttachments items={messageAttachments} />
            </div>

            {index < thread.length - 1 ? (
              <div className="mt-4 flex justify-center">
                <span className="h-px w-full max-w-xs bg-[#eef0f2]" />
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

export function getReplyParentId(thread: MailListItem[]) {
  return thread[thread.length - 1]?.id ?? thread[0]?.id ?? "";
}
