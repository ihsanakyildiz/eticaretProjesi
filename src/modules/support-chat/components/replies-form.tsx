"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createSupportChatReplyAction,
  deleteSupportChatReplyAction,
} from "@/modules/support-chat/actions";
import type { SupportChatReplyRow } from "@/modules/support-chat/kinds";

export function SupportChatRepliesForm({ replies }: { replies: SupportChatReplyRow[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-5">
      <form
        className="space-y-3 rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          setError(null);
          startTransition(async () => {
            const result = await createSupportChatReplyAction(form);
            if (result.error) {
              setError(result.error);
              return;
            }
            event.currentTarget.reset();
            router.refresh();
          });
        }}
      >
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">Başlık</span>
          <input
            name="title"
            required
            placeholder="Örn. Fiyat bilgisi"
            className="w-full rounded-md border border-[#e9ebec] px-3 py-2.5 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">Yanıt</span>
          <textarea
            name="body"
            required
            rows={3}
            placeholder="Merhaba! Bu ürünle ilgili bilgi verebilir miyim?"
            className="w-full rounded-md border border-[#e9ebec] px-3 py-2.5 text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-[#0ab39c] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#099885] disabled:opacity-50"
        >
          Hazır yanıt ekle
        </button>
      </form>
      <ul className="divide-y divide-[#e9ebec] overflow-hidden rounded-lg border border-[#e9ebec] bg-white">
        {replies.length === 0 ? (
          <li className="px-4 py-8 text-center text-sm text-slate-500">Hazır yanıt yok.</li>
        ) : (
          replies.map((reply) => (
            <li key={reply.id} className="flex items-start justify-between gap-3 px-4 py-3">
              <div>
                <p className="font-medium text-slate-800">{reply.title}</p>
                <p className="text-sm text-slate-500">{reply.body}</p>
              </div>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  const form = new FormData();
                  form.set("id", reply.id);
                  startTransition(async () => {
                    const result = await deleteSupportChatReplyAction(form);
                    if (result.error) {
                      setError(result.error);
                      return;
                    }
                    router.refresh();
                  });
                }}
                className="text-sm font-medium text-rose-600 hover:underline"
              >
                Sil
              </button>
            </li>
          ))
        )}
      </ul>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
    </div>
  );
}
