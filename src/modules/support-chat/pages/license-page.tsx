import { SupportChatLicenseForm } from "@/modules/support-chat/components/license-form";
import { loadSupportChatLicenseState } from "@/modules/support-chat/license";
import { SupportChatSettingsFrame } from "@/modules/support-chat/pages/settings-frame";
import { getPanelAccess } from "@/lib/staff-permissions";

export async function SupportChatLicensePage() {
  const [state, access] = await Promise.all([
    loadSupportChatLicenseState(),
    getPanelAccess(),
  ]);
  return (
    <SupportChatSettingsFrame
      title="Sohbet lisansı"
      description="Bu modül ayrı satılır. Lisans olmadan gelen kutusu ve kanal bağlantıları kapalıdır; mağaza etkilenmez."
    >
      <SupportChatLicenseForm state={state} isAdmin={access.isAdmin} />
    </SupportChatSettingsFrame>
  );
}
