import { redirect } from "next/navigation";
import { SupportChatLockedCard } from "@/modules/support-chat/components/locked-card";
import { SupportChatMetaPickerForm } from "@/modules/support-chat/components/meta-picker-form";
import { requirePermission } from "@/lib/staff-permissions";
import { isSupportChatLicensed } from "@/modules/support-chat/license";
import { loadMetaOAuthSession } from "@/modules/support-chat/meta-oauth";
import { SupportChatSettingsFrame } from "@/modules/support-chat/pages/settings-frame";

export async function SupportChatMetaPickerPage({ sessionId }: { sessionId: string }) {
  const licensed = await isSupportChatLicensed();
  if (!licensed) {
    return (
      <SupportChatSettingsFrame
        title="Meta hesapları"
        description="Facebook, Instagram ve WhatsApp hesaplarını seçin."
      >
        <SupportChatLockedCard />
      </SupportChatSettingsFrame>
    );
  }

  const gate = await requirePermission("settings_support", "update");
  if (!gate.ok || !gate.session.user?.id) {
    redirect("/admin/settings/support/kanallar?meta=yetki");
  }

  const session = await loadMetaOAuthSession(sessionId, gate.session.user.id);
  if (!session || session.assets.length === 0) {
    redirect("/admin/settings/support/kanallar?meta=sure");
  }

  return (
    <SupportChatSettingsFrame
      title="Meta hesaplarını seçin"
      description="Kendi Facebook sayfanızı, Instagram hesabınızı ve WhatsApp numaranızı işaretleyin. Seçilenler projeye bağlanır."
    >
      <SupportChatMetaPickerForm
        sessionId={session.id}
        assets={session.assets.map((asset) => ({
          pickId: asset.pickId,
          group: asset.group,
          name: asset.name,
          hint: asset.hint,
        }))}
      />
    </SupportChatSettingsFrame>
  );
}
