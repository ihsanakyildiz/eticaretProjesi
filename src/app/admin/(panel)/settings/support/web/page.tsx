import type { Metadata } from "next";
import { SupportChatWebSettingsPage } from "@/modules/support-chat/pages/web-chat-settings-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Web sohbet ayarları",
};

export default function Page() {
  return <SupportChatWebSettingsPage />;
}
