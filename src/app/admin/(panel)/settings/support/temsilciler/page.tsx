import type { Metadata } from "next";
import { SupportChatAgentsPage } from "@/modules/support-chat/pages/agents-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sohbet temsilcileri",
};

export default function Page() {
  return <SupportChatAgentsPage />;
}
