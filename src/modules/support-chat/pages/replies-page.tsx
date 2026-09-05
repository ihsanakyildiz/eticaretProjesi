import { SupportChatLockedCard } from "@/modules/support-chat/components/locked-card";
import { SupportChatRepliesForm } from "@/modules/support-chat/components/replies-form";
import { listSupportChatReplies } from "@/modules/support-chat/db";
import { isSupportChatLicensed } from "@/modules/support-chat/license";
import { SupportChatSettingsFrame } from "@/modules/support-chat/pages/settings-frame";

export async function SupportChatRepliesPage() {
  const licensed = await isSupportChatLicensed();
  const replies = licensed ? await listSupportChatReplies() : [];
  return (
    <SupportChatSettingsFrame
      title="Hazır yanıtlar"
      description="Sık kullanılan cevapları kaydedin; sohbet ekranında tek tıkla kullanılır."
    >
      {licensed ? <SupportChatRepliesForm replies={replies} /> : <SupportChatLockedCard />}
    </SupportChatSettingsFrame>
  );
}
