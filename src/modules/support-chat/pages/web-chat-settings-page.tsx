import { SupportChatLockedCard } from "@/modules/support-chat/components/locked-card";
import { SupportChatWebSettingsForm } from "@/modules/support-chat/components/web-chat-settings-form";
import { isSupportChatLicensed } from "@/modules/support-chat/license";
import { SupportChatSettingsFrame } from "@/modules/support-chat/pages/settings-frame";
import { loadWebChatAppearance } from "@/modules/support-chat/web-chat-settings";

export async function SupportChatWebSettingsPage() {
  const [licensed, appearance] = await Promise.all([
    isSupportChatLicensed(),
    loadWebChatAppearance(),
  ]);

  return (
    <SupportChatSettingsFrame
      title="Web sohbet"
      description="Sitedeki sohbet penceresinin görünümünü, metinlerini ve konumunu buradan yönetin."
    >
      {licensed ? <SupportChatWebSettingsForm appearance={appearance} /> : <SupportChatLockedCard />}
    </SupportChatSettingsFrame>
  );
}
