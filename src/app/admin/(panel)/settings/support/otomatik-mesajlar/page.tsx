import type { Metadata } from "next";
import { SupportChatAutoRepliesSettingsPage } from "@/modules/support-chat/pages/auto-replies-settings-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Otomatik mesajlar",
};

export default function Page() {
  return <SupportChatAutoRepliesSettingsPage />;
}
