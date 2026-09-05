import { SupportChatLockedCard } from "@/modules/support-chat/components/locked-card";
import { isSupportChatLicensed } from "@/modules/support-chat/license";
import { SupportChatSettingsFrame } from "@/modules/support-chat/pages/settings-frame";

export async function SupportChatNotificationsPage() {
  const licensed = await isSupportChatLicensed();
  return (
    <SupportChatSettingsFrame
      title="Bildirimler"
      description="Yeni mesaj, atama ve kaçırılan sohbet uyarıları. Kanal webhook’ları bağlandıktan sonra açılacak."
    >
      {licensed ? (
        <div className="rounded-lg border border-[#e9ebec] bg-white p-5 text-sm text-slate-600 shadow-sm">
          Bildirim kanalları (tarayıcı, e-posta, ses) bir sonraki adımda eklenecek. Şimdilik tüm
          sohbetler gelen kutusunda canlı listelenir.
        </div>
      ) : (
        <SupportChatLockedCard />
      )}
    </SupportChatSettingsFrame>
  );
}
