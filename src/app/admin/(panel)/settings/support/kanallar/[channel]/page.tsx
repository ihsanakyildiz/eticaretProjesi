import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { SupportChatChannelSettingsPage } from "@/modules/support-chat/pages/channel-settings-page";
import {
  SUPPORT_CHAT_CHANNEL_GROUP_SLUGS,
  supportChatChannelGroupFromSlug,
  supportChatChannelGroupLabel,
} from "@/modules/support-chat/kinds";

export const dynamic = "force-dynamic";

const CANONICAL_SLUGS = new Set<string>(Object.values(SUPPORT_CHAT_CHANNEL_GROUP_SLUGS));

export async function generateMetadata({
  params,
}: {
  params: Promise<{ channel: string }>;
}): Promise<Metadata> {
  const { channel: slug } = await params;
  const group = supportChatChannelGroupFromSlug(slug);
  return {
    title: group ? `${supportChatChannelGroupLabel(group)} kanalı` : "Sohbet kanalı",
  };
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ channel: string }>;
  searchParams: Promise<{ meta?: string }>;
}) {
  const [{ channel: slug }, query] = await Promise.all([params, searchParams]);
  const group = supportChatChannelGroupFromSlug(slug);
  if (!group) notFound();
  const canonical = SUPPORT_CHAT_CHANNEL_GROUP_SLUGS[group];
  if (!CANONICAL_SLUGS.has(slug) || slug !== canonical) {
    const suffix = query.meta ? `?meta=${encodeURIComponent(query.meta)}` : "";
    redirect(`/admin/settings/support/kanallar/${canonical}${suffix}`);
  }
  return <SupportChatChannelSettingsPage group={group} metaStatus={query.meta} />;
}
