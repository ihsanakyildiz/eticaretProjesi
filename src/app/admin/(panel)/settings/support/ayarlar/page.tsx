import type { Metadata } from "next";
import { SupportChatGeneralSettingsPage } from "@/modules/support-chat/pages/general-settings-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sohbet ayarları",
};

export default function Page() {
  return <SupportChatGeneralSettingsPage />;
}
