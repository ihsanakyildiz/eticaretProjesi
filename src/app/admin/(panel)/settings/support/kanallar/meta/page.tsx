import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SupportChatMetaPickerPage } from "@/modules/support-chat/pages/meta-picker-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Meta hesaplarını bağla",
  description: "Facebook, Instagram ve WhatsApp hesap seçimi",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  const params = await searchParams;
  if (!params.session) {
    redirect("/admin/settings/support/kanallar?meta=sure");
  }
  return <SupportChatMetaPickerPage sessionId={params.session} />;
}
