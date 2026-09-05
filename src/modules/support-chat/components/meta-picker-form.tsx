"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { connectSupportChatMetaAssetsAction } from "@/modules/support-chat/actions";
import {
  supportChatMetaGroupLabel,
  type SupportChatMetaGroup,
  type SupportChatMetaPick,
} from "@/modules/support-chat/kinds";

const GROUPS: SupportChatMetaGroup[] = ["facebook", "instagram", "whatsapp"];

export function SupportChatMetaPickerForm({
  sessionId,
  assets,
}: {
  sessionId: string;
  assets: SupportChatMetaPick[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const grouped = useMemo(
    () =>
      GROUPS.map((group) => ({
        group,
        items: assets.filter((asset) => asset.group === group),
      })).filter((entry) => entry.items.length > 0),
    [assets],
  );

  return (
    <form
      className="space-y-4 rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setError(null);
        startTransition(async () => {
          const result = await connectSupportChatMetaAssetsAction(form);
          if ("error" in result && result.error) {
            setError(result.error);
            return;
          }
          router.push("/admin/settings/support/kanallar?meta=ok");
          router.refresh();
        });
      }}
    >
      <input type="hidden" name="sessionId" value={sessionId} />
      <p className="text-sm text-slate-600">
        Bağlamak istediğiniz Facebook sayfası, Instagram hesabı ve WhatsApp numarasını işaretleyin.
      </p>
      {grouped.map((entry) => (
        <fieldset key={entry.group} className="space-y-2">
          <legend className="text-sm font-semibold text-slate-800">
            {supportChatMetaGroupLabel(entry.group)}
          </legend>
          <ul className="divide-y divide-[#e9ebec] rounded-md border border-[#e9ebec]">
            {entry.items.map((asset) => (
              <li key={asset.pickId}>
                <label className="flex cursor-pointer items-start gap-3 px-3 py-3 hover:bg-slate-50">
                  <input
                    type="checkbox"
                    name="pickId"
                    value={asset.pickId}
                    defaultChecked
                    className="mt-1"
                  />
                  <span>
                    <span className="block text-sm font-medium text-slate-800">{asset.name}</span>
                    <span className="block text-xs text-slate-500">{asset.hint}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      ))}
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-[#1877F2] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#166fe5] disabled:opacity-50"
        >
          Seçilenleri bağla
        </button>
        <a
          href="/admin/settings/support/kanallar"
          className="rounded-md border border-[#e9ebec] px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          Vazgeç
        </a>
      </div>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
    </form>
  );
}
