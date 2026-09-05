import type { Metadata } from "next";
import { SupportChatInboxPage } from "@/modules/support-chat/pages/inbox-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Destek paneli",
  description: "Sosyal medya ve mesajlaşma gelen kutusu",
};

export default function Page() {
  return <SupportChatInboxPage />;
}
