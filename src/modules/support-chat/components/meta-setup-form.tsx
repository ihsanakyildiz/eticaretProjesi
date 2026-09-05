"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveSupportChatMetaConfigAction } from "@/modules/support-chat/actions";

export function SupportChatMetaSetupForm({
  appId,
  hasSecret,
  configId,
  callbackUrl,
  webhookUrl,
  webhookVerifyToken,
}: {
  appId: string;
  hasSecret: boolean;
  configId: string;
  callbackUrl: string;
  webhookUrl: string;
  webhookVerifyToken: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-3 rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setError(null);
        setSaved(false);
        startTransition(async () => {
          const result = await saveSupportChatMetaConfigAction(form);
          if ("error" in result && result.error) {
            setError(result.error);
            return;
          }
          setSaved(true);
          router.refresh();
        });
      }}
    >
      <div>
        <h2 className="text-sm font-semibold text-slate-800">Meta uygulama bilgileri</h2>
        <p className="mt-1 text-xs text-slate-500">
          Meta Developer Console’da oluşturduğunuz uygulamanın ID ve gizli anahtarını buraya kaydedin.
          Yerelde çalışırken Facebook localhost kabul etmez; ngrok HTTPS adresini yazıp aynı adresi
          uygulamaya ekleyin.
        </p>
      </div>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-500">Uygulama ID</span>
        <input
          name="appId"
          required
          defaultValue={appId}
          placeholder="1234567890"
          className="w-full rounded-md border border-[#e9ebec] px-3 py-2.5 text-sm"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-500">
          Uygulama gizli anahtarı
          {hasSecret ? " (boş bırakırsanız mevcut değer korunur)" : ""}
        </span>
        <input
          name="appSecret"
          type="password"
          autoComplete="new-password"
          required={!hasSecret}
          placeholder={hasSecret ? "••••••••" : "App Secret"}
          className="w-full rounded-md border border-[#e9ebec] px-3 py-2.5 text-sm"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-500">
          WhatsApp Embedded Signup yapılandırma ID (isteğe bağlı)
        </span>
        <input
          name="configId"
          defaultValue={configId}
          placeholder="Facebook Login for Business config_id"
          className="w-full rounded-md border border-[#e9ebec] px-3 py-2.5 text-sm"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-500">
          Geçerli OAuth yönlendirme adresi
        </span>
        <p className="mb-1 text-xs text-slate-400">
          Örnek: https://abcd-12.ngrok-free.app/api/support-chat/meta/callback
        </p>
        <input
          name="callbackUrl"
          required
          defaultValue={callbackUrl}
          placeholder="https://abcd-12.ngrok-free.app/api/support-chat/meta/callback"
          className="w-full rounded-md border border-[#e9ebec] px-3 py-2.5 text-sm"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-500">Webhook adresi</span>
        <p className="mb-1 text-xs text-slate-400">
          Örnek: https://abcd-12.ngrok-free.app/api/support-chat/webhook/meta
        </p>
        <input
          name="webhookUrl"
          required
          defaultValue={webhookUrl}
          placeholder="https://abcd-12.ngrok-free.app/api/support-chat/webhook/meta"
          className="w-full rounded-md border border-[#e9ebec] px-3 py-2.5 text-sm"
        />
      </label>
      {webhookVerifyToken ? (
        <div className="grid gap-1 text-xs">
          <p className="font-medium text-slate-600">Webhook doğrulama jetonu</p>
          <code className="break-all rounded-md bg-slate-50 px-3 py-2 text-slate-700">
            {webhookVerifyToken}
          </code>
        </div>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-[#405189] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#364574] disabled:opacity-50"
      >
        Meta uygulamasını kaydet
      </button>
      {saved ? <p className="text-sm text-emerald-700">Meta uygulama bilgileri kaydedildi.</p> : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
    </form>
  );
}
