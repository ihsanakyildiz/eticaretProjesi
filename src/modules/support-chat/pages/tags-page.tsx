import { SupportChatLockedCard } from "@/modules/support-chat/components/locked-card";
import { SupportChatTagsForm } from "@/modules/support-chat/components/tags-form";
import { listSupportChatTags } from "@/modules/support-chat/db";
import { isSupportChatLicensed } from "@/modules/support-chat/license";
import { SupportChatSettingsFrame } from "@/modules/support-chat/pages/settings-frame";

export async function SupportChatTagsPage() {
  const licensed = await isSupportChatLicensed();
  const tags = licensed ? await listSupportChatTags() : [];
  return (
    <SupportChatSettingsFrame
      title="Etiketler"
      description="Konuşmaları Sipariş Verecek, Yeni Müşteri gibi etiketlerle ayırın."
    >
      {licensed ? <SupportChatTagsForm tags={tags} /> : <SupportChatLockedCard />}
    </SupportChatSettingsFrame>
  );
}
