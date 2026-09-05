import Link from "next/link";
import { SupportChatChannelSubnav } from "@/modules/support-chat/components/channel-subnav";
import { SupportChatLockedCard } from "@/modules/support-chat/components/locked-card";
import { listSupportChatAccounts } from "@/modules/support-chat/db";
import {
  SUPPORT_CHAT_CHANNEL_GROUPS,
  supportChatChannelGroupLabel,
  supportChatChannelGroupOf,
  supportChatChannelGroupSettingsDescription,
  supportChatChannelGroupSettingsHref,
  supportChatMetaQueryMessage,
} from "@/modules/support-chat/kinds";
import { isSupportChatLicensed } from "@/modules/support-chat/license";
import { SupportChatSettingsFrame } from "@/modules/support-chat/pages/settings-frame";

export async function SupportChatChannelsPage({
  metaStatus,
}: {
  metaStatus?: string;
}) {
  const licensed = await isSupportChatLicensed();
  const accounts = licensed ? await listSupportChatAccounts() : [];
  const message = supportChatMetaQueryMessage(metaStatus);

  return (
    <SupportChatSettingsFrame
      title="Kanallar"
      description="Meta, Telegram, TikTok ve web sohbet ayarları ayrı sayfalardan yönetilir."
    >
      {licensed ? (
        <div className="space-y-5">
          {message ? (
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
          <SupportChatChannelSubnav />
          <div className="grid gap-3 sm:grid-cols-2">
            {SUPPORT_CHAT_CHANNEL_GROUPS.map((group) => {
              const count = accounts.filter(
                (account) => supportChatChannelGroupOf(account.channel) === group,
              ).length;
              return (
                <Link
                  key={group}
                  href={supportChatChannelGroupSettingsHref(group)}
                  className="rounded-lg border border-[#e9ebec] bg-white p-4 shadow-sm transition hover:border-[#405189]/40 hover:shadow"
                >
                  <p className="font-semibold text-slate-800">{supportChatChannelGroupLabel(group)}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {supportChatChannelGroupSettingsDescription(group)}
                  </p>
                  <p className="mt-3 text-xs font-medium text-[#405189]">
                    {count} hesap · Ayarları aç
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      ) : (
        <SupportChatLockedCard />
      )}
    </SupportChatSettingsFrame>
  );
}
