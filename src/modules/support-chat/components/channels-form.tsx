"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  supportChatChannelLabel,
  type SupportChatAccountRow,
  type SupportChatChannel,
  type SupportChatDepartmentRow,
} from "@/modules/support-chat/kinds";
import {
  createSupportChatAccountAction,
  deleteSupportChatAccountAction,
  setSupportChatAccountDepartmentAction,
  toggleSupportChatAccountAction,
} from "@/modules/support-chat/actions";

function isMetaChannel(channel: SupportChatChannel) {
  switch (channel) {
    case "WHATSAPP":
    case "FACEBOOK_MESSENGER":
    case "FACEBOOK_POST":
    case "INSTAGRAM_DM":
    case "INSTAGRAM_POST":
      return true;
    case "TELEGRAM":
    case "TIKTOK":
    case "WEB":
      return false;
    default: {
      const _exhaustive: never = channel;
      return _exhaustive;
    }
  }
}

const fieldClass = "w-full rounded-md border border-[#e9ebec] bg-white px-3 py-2 text-sm text-slate-700";

export function SupportChatChannelsForm({
  accounts,
  channels,
  departments,
}: {
  accounts: SupportChatAccountRow[];
  channels: SupportChatChannel[];
  departments: SupportChatDepartmentRow[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const allowed = new Set(channels);
  const channelAccounts = accounts.filter((account) => allowed.has(account.channel));
  const singleChannel = channels.length === 1 ? channels[0] : null;
  const showMetaCards = channels.some((channel) => isMetaChannel(channel));

  function run(action: () => Promise<{ error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function saveDepartment(accountId: string, departmentId: string) {
    const form = new FormData();
    form.set("id", accountId);
    form.set("departmentId", departmentId);
    run(() => setSupportChatAccountDepartmentAction(form));
  }

  return (
    <div className="space-y-5">
      {showMetaCards && channelAccounts.length > 0 ? (
        <div className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold tracking-wide text-slate-800 uppercase">
              Bağlı hesaplar
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Senkronizasyonu tamamladıktan sonra sayfa bilgilerini burada yönetin. Departman
              seçilen kanaldan gelen sohbetler o departmana düşer.
            </p>
          </div>
          <ul className="space-y-3">
            {channelAccounts.map((account) => (
              <li key={account.id} className="rounded-lg border border-[#e9ebec] bg-white p-4 shadow-sm">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-800">{account.channelLabel}</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        const form = new FormData();
                        form.set("id", account.id);
                        form.set("status", account.status === "ACTIVE" ? "DISABLED" : "ACTIVE");
                        run(() => toggleSupportChatAccountAction(form));
                      }}
                      className="text-sm font-medium text-[#405189] hover:underline disabled:opacity-50"
                    >
                      {account.status === "ACTIVE" ? "Durdur" : "Aç"}
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        if (!window.confirm("Hesap silinsin mi?")) return;
                        const form = new FormData();
                        form.set("id", account.id);
                        run(() => deleteSupportChatAccountAction(form));
                      }}
                      className="text-sm font-medium text-rose-600 hover:underline disabled:opacity-50"
                    >
                      Sil
                    </button>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <label>
                    <span className="mb-1 block text-xs font-medium text-slate-500">Sayfa ismi</span>
                    <input value={account.name} readOnly className={fieldClass} />
                  </label>
                  <label>
                    <span className="mb-1 block text-xs font-medium text-slate-500">Sayfa kimliği</span>
                    <input value={account.pageId || account.externalId} readOnly className={fieldClass} />
                  </label>
                  <label>
                    <span className="mb-1 block text-xs font-medium text-slate-500">Sayfa jetonu</span>
                    <input
                      type="password"
                      value={account.hasPageToken ? "••••••••••••••••" : ""}
                      readOnly
                      className={fieldClass}
                    />
                  </label>
                  {account.instagramId || account.channel.startsWith("INSTAGRAM") ? (
                    <>
                      <label>
                        <span className="mb-1 block text-xs font-medium text-slate-500">Instagram ID</span>
                        <input value={account.instagramId} readOnly className={fieldClass} />
                      </label>
                      <label>
                        <span className="mb-1 block text-xs font-medium text-slate-500">
                          Instagram kullanıcı adı
                        </span>
                        <input value={account.instagramUsername} readOnly className={fieldClass} />
                      </label>
                    </>
                  ) : null}
                  {account.phoneNumberId || account.channel === "WHATSAPP" ? (
                    <label>
                      <span className="mb-1 block text-xs font-medium text-slate-500">WhatsApp numarası</span>
                      <input
                        value={account.phoneNumberId || account.externalId}
                        readOnly
                        className={fieldClass}
                      />
                    </label>
                  ) : null}
                  <label>
                    <span className="mb-1 block text-xs font-medium text-slate-500">Departman</span>
                    <select
                      value={account.departmentId ?? ""}
                      disabled={pending}
                      onChange={(event) => saveDepartment(account.id, event.target.value)}
                      className={fieldClass}
                    >
                      <option value="">— Departman —</option>
                      {departments.map((department) => (
                        <option key={department.id} value={department.id}>
                          {department.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-[#e9ebec] bg-white shadow-sm">
          {channelAccounts.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-500">Bu kanalda henüz hesap yok.</p>
          ) : (
            <ul className="divide-y divide-[#e9ebec]">
              {channelAccounts.map((account) => (
                <li key={account.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-800">{account.name}</p>
                    <p className="text-xs text-slate-500">
                      {account.channelLabel}
                      {account.externalId ? ` · ${account.externalId}` : ""}
                      {account.status === "DISABLED" ? " · kapalı" : ""}
                    </p>
                    <select
                      value={account.departmentId ?? ""}
                      disabled={pending}
                      onChange={(event) => saveDepartment(account.id, event.target.value)}
                      className="mt-2 max-w-xs rounded-md border border-[#e9ebec] bg-white px-3 py-1.5 text-sm"
                    >
                      <option value="">— Departman —</option>
                      {departments.map((department) => (
                        <option key={department.id} value={department.id}>
                          {department.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        const form = new FormData();
                        form.set("id", account.id);
                        form.set("status", account.status === "ACTIVE" ? "DISABLED" : "ACTIVE");
                        run(() => toggleSupportChatAccountAction(form));
                      }}
                      className="text-sm font-medium text-[#405189] hover:underline disabled:opacity-50"
                    >
                      {account.status === "ACTIVE" ? "Durdur" : "Aç"}
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        if (!window.confirm("Hesap silinsin mi?")) return;
                        const form = new FormData();
                        form.set("id", account.id);
                        run(() => deleteSupportChatAccountAction(form));
                      }}
                      className="text-sm font-medium text-rose-600 hover:underline disabled:opacity-50"
                    >
                      Sil
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <form
        className="grid gap-3 rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          run(() => createSupportChatAccountAction(form));
          event.currentTarget.reset();
        }}
      >
        {singleChannel ? (
          <input type="hidden" name="channel" value={singleChannel} />
        ) : (
          <label>
            <span className="mb-1 block text-xs font-medium text-slate-500">Kanal</span>
            <select
              name="channel"
              required
              className="w-full rounded-md border border-[#e9ebec] px-3 py-2.5 text-sm"
              defaultValue={channels[0] ?? ""}
            >
              {channels.map((item) => (
                <option key={item} value={item}>
                  {supportChatChannelLabel(item)}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          <span className="mb-1 block text-xs font-medium text-slate-500">Hesap adı</span>
          <input
            name="name"
            required
            placeholder="Örn. Mağaza Instagram"
            className="w-full rounded-md border border-[#e9ebec] px-3 py-2.5 text-sm"
          />
        </label>
        <label>
          <span className="mb-1 block text-xs font-medium text-slate-500">
            Sayfa / numara / kullanıcı adı
          </span>
          <input
            name="externalId"
            placeholder="Sayfa ID, telefon veya @kullanici"
            className="w-full rounded-md border border-[#e9ebec] px-3 py-2.5 text-sm"
          />
        </label>
        <label>
          <span className="mb-1 block text-xs font-medium text-slate-500">Departman</span>
          <select name="departmentId" className="w-full rounded-md border border-[#e9ebec] px-3 py-2.5 text-sm">
            <option value="">— Departman —</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
        </label>
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-[#0ab39c] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#099885] disabled:opacity-50"
          >
            Hesap ekle
          </button>
        </div>
      </form>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
    </div>
  );
}
