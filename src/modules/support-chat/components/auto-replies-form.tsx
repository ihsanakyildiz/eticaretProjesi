"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveSupportChatAutoRepliesAction } from "@/modules/support-chat/actions";
import {
  pickSupportChatAutoReply,
  type SupportChatAutoReplies,
} from "@/modules/support-chat/auto-replies";
import {
  formatSupportChatWorkingHours,
  isSupportChatOnline,
  type SupportChatWorkingHours,
} from "@/modules/support-chat/working-hours";

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  hint: string;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border border-[#e9ebec] bg-slate-50/80 px-4 py-3">
      <span>
        <span className="block text-sm font-medium text-slate-800">{label}</span>
        <span className="mt-0.5 block text-xs text-slate-500">{hint}</span>
      </span>
      <span className="flex shrink-0 items-center gap-2">
        <span className={`text-xs font-semibold ${checked ? "text-emerald-700" : "text-slate-400"}`}>
          {checked ? "Aktif" : "Pasif"}
        </span>
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="h-4 w-4 accent-[#405189]"
        />
      </span>
    </label>
  );
}

function MessageField({
  value,
  onChange,
  disabled,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-500">Mesaj</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        rows={4}
        maxLength={2000}
        placeholder={placeholder}
        className="w-full rounded-md border border-[#e9ebec] px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#405189] disabled:bg-slate-50 disabled:text-slate-400"
      />
    </label>
  );
}

export function SupportChatAutoRepliesForm({
  settings,
  hours,
}: {
  settings: SupportChatAutoReplies;
  hours: SupportChatWorkingHours;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState(settings);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const scheduleOnline = isSupportChatOnline(hours);
  const preview = useMemo(() => pickSupportChatAutoReply(form, hours), [form, hours]);
  const status = form.vacation.enabled
    ? "Tatil modu açık — mesai saatleri yok sayılır."
    : scheduleOnline
      ? `Mesai içinde · ${formatSupportChatWorkingHours(hours)}`
      : `Mesai dışında · ${formatSupportChatWorkingHours(hours)}`;

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData();
        data.set("settings", JSON.stringify(form));
        setError(null);
        setMessage(null);
        startTransition(async () => {
          const result = await saveSupportChatAutoRepliesAction(data);
          if ("error" in result) {
            setError(result.error);
            return;
          }
          setMessage("Otomatik mesaj ayarları kaydedildi.");
          router.refresh();
        });
      }}
    >
      <div className="rounded-lg border border-[#e9ebec] bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
        <p className="font-medium text-slate-800">Şu anki durum</p>
        <p className="mt-1">{status}</p>
        <p className="mt-1 text-xs text-slate-500">
          {preview
            ? `Müşteri yazarsa gönderilecek: ${
                preview.kind === "vacation"
                  ? "tatil mesajı"
                  : preview.kind === "hours"
                    ? "mesai dışı mesajı"
                    : "karşılama mesajı"
              }.`
            : "Müşteri yazarsa otomatik mesaj gönderilmez."}
        </p>
      </div>

      <section className="space-y-3 rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800">Tatil modu</h2>
        <p className="text-sm text-slate-500">
          Açıkken çalışma saati ayarları geçersiz kalır. Web sohbet kapalı görünür; mesai dışı ve
          karşılama mesajları gönderilmez.
        </p>
        <Toggle
          checked={form.vacation.enabled}
          onChange={(enabled) => setForm((current) => ({ ...current, vacation: { ...current.vacation, enabled } }))}
          label="Tatil modu"
          hint="Aktifken mesai saatleri dikkate alınmaz."
        />
        <Toggle
          checked={form.vacation.messageEnabled}
          onChange={(messageEnabled) =>
            setForm((current) => ({ ...current, vacation: { ...current.vacation, messageEnabled } }))
          }
          label="Tatil mesajı"
          hint="Müşteri yazınca tüm sohbet kanallarına tatil metni gider."
        />
        <MessageField
          value={form.vacation.message}
          onChange={(next) => setForm((current) => ({ ...current, vacation: { ...current.vacation, message: next } }))}
          disabled={!form.vacation.messageEnabled}
          placeholder="Tatilde olduğunuzu ve ne zaman döneceğinizi yazın."
        />
      </section>

      <section
        className={`space-y-3 rounded-lg border bg-white p-5 shadow-sm ${
          form.vacation.enabled ? "border-amber-200" : "border-[#e9ebec]"
        }`}
      >
        <h2 className="text-sm font-semibold text-slate-800">Mesai dışı otomatik mesaj</h2>
        <p className="text-sm text-slate-500">
          Tatil modu kapalıyken ve mesai saatleri dışındayken tüm sohbet kanallarına gönderilir.
          {form.vacation.enabled ? " Tatil modu açık olduğu için şu anda kullanılmaz." : ""}
        </p>
        <Toggle
          checked={form.hours.enabled}
          onChange={(enabled) => setForm((current) => ({ ...current, hours: { ...current.hours, enabled } }))}
          label="Mesai dışı mesajı"
          hint="Aktifken mesai dışında ilk yazıda bu metin gider."
        />
        <MessageField
          value={form.hours.message}
          onChange={(next) => setForm((current) => ({ ...current, hours: { ...current.hours, message: next } }))}
          disabled={!form.hours.enabled}
          placeholder="Mesai dışında olduğunuzu yazın."
        />
      </section>

      <section
        className={`space-y-3 rounded-lg border bg-white p-5 shadow-sm ${
          form.vacation.enabled || !scheduleOnline ? "border-amber-200" : "border-[#e9ebec]"
        }`}
      >
        <h2 className="text-sm font-semibold text-slate-800">Karşılama mesajı</h2>
        <p className="text-sm text-slate-500">
          Müşteri sohbete ilk yazdığında gönderilir. Mesai dışında ve tatil modunda pasiftir; o
          durumda mesai dışı veya tatil mesajı kullanılır.
        </p>
        <Toggle
          checked={form.welcome.enabled}
          onChange={(enabled) => setForm((current) => ({ ...current, welcome: { ...current.welcome, enabled } }))}
          label="Karşılama mesajı"
          hint="Yalnızca mesai içinde, konuşmanın ilk müşteri mesajında gönderilir."
        />
        <MessageField
          value={form.welcome.message}
          onChange={(next) => setForm((current) => ({ ...current, welcome: { ...current.welcome, message: next } }))}
          disabled={!form.welcome.enabled}
          placeholder="İlk karşılama metnini yazın."
        />
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-[#0ab39c] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#099885] disabled:opacity-50"
        >
          {pending ? "Kaydediliyor…" : "Ayarları kaydet"}
        </button>
        {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      </div>
    </form>
  );
}
