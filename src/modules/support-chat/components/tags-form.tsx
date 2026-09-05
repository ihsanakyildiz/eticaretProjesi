"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createSupportChatTagAction,
  deleteSupportChatTagAction,
} from "@/modules/support-chat/actions";
import type { SupportChatTagRow } from "@/modules/support-chat/kinds";

export function SupportChatTagsForm({ tags }: { tags: SupportChatTagRow[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-5">
      <form
        className="flex flex-wrap items-end gap-3 rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          setError(null);
          startTransition(async () => {
            const result = await createSupportChatTagAction(form);
            if (result.error) {
              setError(result.error);
              return;
            }
            event.currentTarget.reset();
            router.refresh();
          });
        }}
      >
        <label className="min-w-48 flex-1">
          <span className="mb-1 block text-xs font-medium text-slate-500">Etiket</span>
          <input
            name="name"
            required
            placeholder="Örn. Sipariş Verecek"
            className="w-full rounded-md border border-[#e9ebec] px-3 py-2.5 text-sm"
          />
        </label>
        <label>
          <span className="mb-1 block text-xs font-medium text-slate-500">Renk</span>
          <input name="color" type="color" defaultValue="#405189" className="h-10 w-14 rounded" />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-[#0ab39c] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#099885] disabled:opacity-50"
        >
          Ekle
        </button>
      </form>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-2 rounded-full border border-[#e9ebec] bg-white px-3 py-1.5 text-sm"
          >
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: tag.color }} />
            {tag.name}
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                const form = new FormData();
                form.set("id", tag.id);
                startTransition(async () => {
                  const result = await deleteSupportChatTagAction(form);
                  if (result.error) {
                    setError(result.error);
                    return;
                  }
                  router.refresh();
                });
              }}
              className="text-xs text-rose-600"
            >
              Sil
            </button>
          </span>
        ))}
      </div>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
    </div>
  );
}
