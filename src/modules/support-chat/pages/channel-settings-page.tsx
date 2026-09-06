import Link from "next/link";
import { headers } from "next/headers";
import { originFromHeaders } from "@/lib/site-origin";
import { SupportChatChannelSubnav } from "@/modules/support-chat/components/channel-subnav";
import { SupportChatChannelsForm } from "@/modules/support-chat/components/channels-form";
import { SupportChatLockedCard } from "@/modules/support-chat/components/locked-card";
import { SupportChatMetaConnectButton } from "@/modules/support-chat/components/meta-connect-button";
import { SupportChatMetaSetupForm } from "@/modules/support-chat/components/meta-setup-form";
import { listSupportChatAccounts, listSupportChatDepartments } from "@/modules/support-chat/db";
import {
  supportChatChannelGroupLabel,
  supportChatChannelGroupSettingsDescription,
  supportChatChannelsInGroup,
  supportChatMetaQueryMessage,
  type SupportChatChannelGroup,
} from "@/modules/support-chat/kinds";
import { isSupportChatLicensed } from "@/modules/support-chat/license";
import {
  isSupportChatMetaConfigured,
  loadSupportChatMetaConfig,
  resolveMetaCallbackUrl,
  resolveMetaWebhookUrl,
} from "@/modules/support-chat/meta-config";
import { ensureActiveMetaPageSubscriptions } from "@/modules/support-chat/meta-oauth";
import { SupportChatSettingsFrame } from "@/modules/support-chat/pages/settings-frame";

export async function SupportChatChannelSettingsPage({
  group,
  metaStatus,
}: {
  group: SupportChatChannelGroup;
  metaStatus?: string;
}) {
  const licensed = await isSupportChatLicensed();
  if (licensed && group === "META") {
    await ensureActiveMetaPageSubscriptions().catch(() => undefined);
  }
  const [accounts, departments] = licensed
    ? await Promise.all([listSupportChatAccounts(), listSupportChatDepartments()])
    : [[], []];
  const config = licensed ? await loadSupportChatMetaConfig() : null;
  const headerStore = await headers();
  const origin = originFromHeaders(headerStore);
  const message = supportChatMetaQueryMessage(metaStatus);
  const configured = config ? isSupportChatMetaConfigured(config) : false;
  const channels = supportChatChannelsInGroup(group);
  const metaManaged = group === "META";

  return (
    <SupportChatSettingsFrame
      title={supportChatChannelGroupLabel(group)}
      description={supportChatChannelGroupSettingsDescription(group)}
    >
      {licensed ? (
        <div className="space-y-5">
          <SupportChatChannelSubnav />
          {message && metaManaged ? (
            <p
              className={`rounded-lg border px-4 py-3 text-sm ${
                metaStatus === "ok"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-amber-200 bg-amber-50 text-amber-900"
              }`}
            >
              {message}
            </p>
          ) : null}
          {metaManaged && config ? (
            <>
              <SupportChatMetaConnectButton configured={configured} />
              <SupportChatMetaSetupForm
                appId={config.appId}
                hasSecret={Boolean(config.appSecret)}
                configId={config.configId}
                callbackUrl={resolveMetaCallbackUrl(config, origin)}
                webhookUrl={resolveMetaWebhookUrl(config, origin)}
                webhookVerifyToken={config.webhookVerifyToken}
              />
            </>
          ) : null}
          {group === "WEB" ? (
            <p className="rounded-lg border border-[#e9ebec] bg-white px-4 py-3 text-sm text-slate-600">
              Widget görünümü, metinleri ve konumu{" "}
              <Link href="/admin/settings/support/web" className="font-medium text-[#405189] hover:underline">
                Web sohbet
              </Link>{" "}
              sayfasından yönetilir. İlk sohbette “Site web sohbet” hesabı otomatik oluşur.
            </p>
          ) : null}
          <SupportChatChannelsForm accounts={accounts} channels={channels} departments={departments} />
        </div>
      ) : (
        <SupportChatLockedCard />
      )}
    </SupportChatSettingsFrame>
  );
}
