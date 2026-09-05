import { SupportChatAutoRepliesForm } from "@/modules/support-chat/components/auto-replies-form";
import { SupportChatLockedCard } from "@/modules/support-chat/components/locked-card";
import { isSupportChatLicensed } from "@/modules/support-chat/license";
import { SupportChatSettingsFrame } from "@/modules/support-chat/pages/settings-frame";
import { loadSupportChatAutoReplies } from "@/modules/support-chat/auto-replies-store";
import { loadSupportChatWorkingHours } from "@/modules/support-chat/working-hours-store";

export async function SupportChatAutoRepliesSettingsPage() {
  const licensed = await isSupportChatLicensed();
  const [settings, hours] = licensed
    ? await Promise.all([loadSupportChatAutoReplies(), loadSupportChatWorkingHours()])
    : [null, null];

  return (
    <SupportChatSettingsFrame
      title="Otomatik mesajlar"
      description="Tatil modu, mesai dışı yanıt ve ilk karşılama mesajını tüm sohbet kanalları için buradan yönetin."
    >
      {licensed && settings && hours ? (
        <SupportChatAutoRepliesForm settings={settings} hours={hours} />
      ) : (
        <SupportChatLockedCard />
      )}
    </SupportChatSettingsFrame>
  );
}
