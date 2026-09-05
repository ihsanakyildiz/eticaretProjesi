"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveSupportChatWebSettingsAction } from "@/modules/support-chat/actions";
import { WebChatGlyph } from "@/modules/support-chat/components/web-chat-icon";
import {
  WEB_CHAT_ICON_LABELS,
  WEB_CHAT_ICONS,
  type WebChatAppearance,
  type WebChatIcon,
} from "@/modules/support-chat/web-chat-appearance";

function ToggleRow({
  name,
  label,
  hint,
  defaultChecked,
}: {
  name: string;
  label: string;
  hint: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border border-[#e9ebec] bg-white px-4 py-3">
      <span>
        <span className="block text-sm font-medium text-slate-800">{label}</span>
        <span className="mt-0.5 block text-xs text-slate-500">{hint}</span>
      </span>
      <input
        type="checkbox"
        name={name}
        value="1"
        defaultChecked={defaultChecked}
        className="mt-1 h-4 w-4 accent-[#405189]"
      />
    </label>
  );
}

export function SupportChatWebSettingsForm({ appearance }: { appearance: WebChatAppearance }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [icon, setIcon] = useState<WebChatIcon>(appearance.icon);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        form.set("icon", icon);
        setError(null);
        setMessage(null);
        startTransition(async () => {
          const result = await saveSupportChatWebSettingsAction(form);
          if (result.error) {
            setError(result.error);
            return;
          }
          setMessage("Web sohbet ayarları kaydedildi.");
          router.refresh();
        });
      }}
    >
      <section className="space-y-3 rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800">Durum</h2>
        <ToggleRow
          name="enabled"
          label="Web sohbet"
          hint="Pasifken sitede sohbet butonu görünmez."
          defaultChecked={appearance.enabled}
        />
        <ToggleRow
          name="membership"
          label="Üyelik / iletişim formu"
          hint="Pasifken ziyaretçiden ad, e-posta veya telefon istenmez."
          defaultChecked={appearance.membership}
        />
      </section>

      <section className="space-y-3 rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800">Görünüm</h2>
        <div>
          <p className="mb-2 text-xs font-medium text-slate-500">Sohbet ikonu</p>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
            {WEB_CHAT_ICONS.map((item) => {
              const selected = icon === item;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setIcon(item)}
                  title={WEB_CHAT_ICON_LABELS[item]}
                  className={`grid h-12 place-items-center rounded-xl border ${
                    selected
                      ? "border-[#405189] bg-[#405189]/10 text-[#405189]"
                      : "border-[#e9ebec] text-slate-500 hover:border-[#405189]/40"
                  }`}
                >
                  <WebChatGlyph icon={item} className="h-5 w-5" />
                  <span className="sr-only">{WEB_CHAT_ICON_LABELS[item]}</span>
                </button>
              );
            })}
          </div>
        </div>
        <ToggleRow
          name="teaserEnabled"
          label="Sohbet balonu görünsün"
          hint="Kapalıyken yalnızca yuvarlak buton durur."
          defaultChecked={appearance.teaserEnabled}
        />
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">Sohbet balon metni</span>
          <input
            name="teaserText"
            defaultValue={appearance.teaserText}
            className="w-full rounded-md border border-[#e9ebec] px-3 py-2.5 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">
            Üye değilse gösterilecek balon metni
          </span>
          <input
            name="teaserGuestText"
            defaultValue={appearance.teaserGuestText}
            className="w-full rounded-md border border-[#e9ebec] px-3 py-2.5 text-sm"
          />
        </label>
        <ToggleRow
          name="showAgentName"
          label="Temsilci adı görünsün"
          hint="Kapalıyken başlıkta site adı yerine Destek yazılır."
          defaultChecked={appearance.showAgentName}
        />
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">
            Kullanıcıya gösterilecek mesaj
          </span>
          <textarea
            name="greeting"
            rows={3}
            defaultValue={appearance.greeting}
            className="w-full rounded-md border border-[#e9ebec] px-3 py-2.5 text-sm"
          />
        </label>
        <fieldset>
          <legend className="mb-2 text-xs font-medium text-slate-500">Sohbet konumu</legend>
          <div className="flex gap-2">
            <label className="flex-1 cursor-pointer rounded-lg border border-[#e9ebec] px-3 py-2.5 text-sm has-[:checked]:border-[#405189] has-[:checked]:bg-[#405189]/5">
              <input
                type="radio"
                name="position"
                value="right"
                defaultChecked={appearance.position === "right"}
                className="mr-2 accent-[#405189]"
              />
              Sağda
            </label>
            <label className="flex-1 cursor-pointer rounded-lg border border-[#e9ebec] px-3 py-2.5 text-sm has-[:checked]:border-[#405189] has-[:checked]:bg-[#405189]/5">
              <input
                type="radio"
                name="position"
                value="left"
                defaultChecked={appearance.position === "left"}
                className="mr-2 accent-[#405189]"
              />
              Solda
            </label>
          </div>
        </fieldset>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-[#0ab39c] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#099885] disabled:opacity-50"
        >
          {pending ? "Kaydediliyor…" : "Kaydet"}
        </button>
        {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      </div>
    </form>
  );
}
