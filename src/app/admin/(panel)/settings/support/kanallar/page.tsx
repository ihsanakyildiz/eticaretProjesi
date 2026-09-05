import type { Metadata } from "next";
import { SupportChatChannelsPage } from "@/modules/support-chat/pages/channels-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sohbet kanalları",
  description: "WhatsApp, Facebook, Instagram ve Telegram hesapları",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ meta?: string }>;
}) {
  const params = await searchParams;
  return <SupportChatChannelsPage metaStatus={params.meta} />;
}
