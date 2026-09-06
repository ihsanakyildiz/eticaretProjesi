"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveSupportChatWorkingHoursAction } from "@/modules/support-chat/actions";
import {
  formatSupportChatWorkingHours,
  SUPPORT_CHAT_WEEKDAY_LABELS,
  SUPPORT_CHAT_WEEKDAY_ORDER,
  type SupportChatDayHours,
  type SupportChatWeekday,
  type SupportChatWorkingHours,
} from "@/modules/support-chat/working-hours";

export function SupportChatWorkingHoursForm({ hours }: { hours: SupportChatWorkingHours }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [days, setDays] = useState(hours.days);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function patch(day: SupportChatWeekday, next: Partial<SupportChatDayHours>) {
    setDays((current) => ({ ...current, [day]: { ...current[day], ...next } }));
  }

  return (
    <form
      className="space-y-4 rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData();
        form.set("hours", JSON.stringify({ timezone: hours.timezone, days }));
        setError(null);
        setMessage(null);
        startTransition(async () => {
          const result = await saveSupportChatWorkingHoursAction(form);
          if ("error" in result) {
            setError(result.error);
            return;
          }
          setMessage("Çalışma saatleri kaydedildi.");
          router.refresh();
        });
      }}
    >
      <p className="text-xs text-slate-500">
        Saatler Türkiye saati (Europe/Istanbul) üzerindendir. Özet:{" "}
        <span className="font-medium text-slate-700">{formatSupportChatWorkingHours({ ...hours, days })}</span>
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold tracking-wide text-slate-400 uppercase">
              <th className="pb-2 font-semibold">Gün</th>
              <th className="pb-2 font-semibold">Açık</th>
              <th className="pb-2 font-semibold">Başlangıç</th>
              <th className="pb-2 font-semibold">Bitiş</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e9ebec]">
            {SUPPORT_CHAT_WEEKDAY_ORDER.map((day) => {
              const row = days[day];
              return (
                <tr key={day}>
                  <td className="py-2.5 font-medium text-slate-800">{SUPPORT_CHAT_WEEKDAY_LABELS[day]}</td>
                  <td className="py-2.5">
                    <input
                      type="checkbox"
                      checked={row.enabled}
                      onChange={(event) => patch(day, { enabled: event.target.checked })}
                      className="h-4 w-4 accent-[#405189]"
                    />
                  </td>
                  <td className="py-2.5">
                    <input
                      type="time"
                      value={row.start}
                      disabled={!row.enabled}
                      onChange={(event) => patch(day, { start: event.target.value })}
                      className="rounded-md border border-[#e9ebec] px-2 py-1.5 disabled:bg-slate-50"
                    />
                  </td>
                  <td className="py-2.5">
                    <input
                      type="time"
                      value={row.end}
                      disabled={!row.enabled}
                      onChange={(event) => patch(day, { end: event.target.value })}
                      className="rounded-md border border-[#e9ebec] px-2 py-1.5 disabled:bg-slate-50"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-[#0ab39c] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#099885] disabled:opacity-50"
        >
          {pending ? "Kaydediliyor…" : "Saatleri kaydet"}
        </button>
        {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      </div>
    </form>
  );
}
