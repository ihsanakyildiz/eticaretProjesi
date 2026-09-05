import { getPanelAccess } from "@/lib/staff-permissions";
import { SupportChatDepartmentsForm } from "@/modules/support-chat/components/departments-form";
import { SupportChatLicenseForm } from "@/modules/support-chat/components/license-form";
import { SupportChatLockedCard } from "@/modules/support-chat/components/locked-card";
import { SupportChatRepliesForm } from "@/modules/support-chat/components/replies-form";
import { SupportChatTagsForm } from "@/modules/support-chat/components/tags-form";
import { SupportChatWorkingHoursForm } from "@/modules/support-chat/components/working-hours-form";
import {
  listSupportChatDepartments,
  listSupportChatReplies,
  listSupportChatTags,
} from "@/modules/support-chat/db";
import { isSupportChatLicensed, loadSupportChatLicenseState } from "@/modules/support-chat/license";
import { SupportChatSettingsFrame } from "@/modules/support-chat/pages/settings-frame";
import { loadSupportChatWorkingHours } from "@/modules/support-chat/working-hours-store";

export async function SupportChatGeneralSettingsPage() {
  const [state, access, licensed] = await Promise.all([
    loadSupportChatLicenseState(),
    getPanelAccess(),
    isSupportChatLicensed(),
  ]);
  const [tags, replies, departments, workingHours] = licensed
    ? await Promise.all([
        listSupportChatTags(),
        listSupportChatReplies(),
        listSupportChatDepartments(),
        loadSupportChatWorkingHours(),
      ])
    : [[], [], [], null];

  return (
    <SupportChatSettingsFrame
      title="Ayarlar"
      description="Lisans, çalışma saatleri, departmanlar, etiketler, hazır yanıtlar ve bildirimler tek sayfada yönetilir."
    >
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-800">Lisans</h2>
        <SupportChatLicenseForm state={state} isAdmin={access.isAdmin} />
      </section>

      {licensed ? (
        <>
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-800">Çalışma saatleri</h2>
            <p className="text-sm text-slate-500">
              Müşteri temsilcilerinin çevrimiçi olduğu gün ve saatleri belirleyin. Web sohbet başlığında
              bu saatler ve açık/kapalı durumu görünür. Tatil modu açıkken bu saatler yok sayılır;
              otomatik yanıtlar Otomatik mesajlar sayfasından yönetilir.
            </p>
            {workingHours ? <SupportChatWorkingHoursForm hours={workingHours} /> : null}
          </section>
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-800">Departmanlar</h2>
            <p className="text-sm text-slate-500">
              Ek destek departmanları ekleyin ve yönetin (isim ve renk).
            </p>
            <SupportChatDepartmentsForm departments={departments} />
          </section>
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-800">Etiketler</h2>
            <p className="text-sm text-slate-500">
              Konuşmaları Sipariş Verecek, Yeni Müşteri gibi etiketlerle ayırın.
            </p>
            <SupportChatTagsForm tags={tags} />
          </section>
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-800">Hazır yanıtlar</h2>
            <p className="text-sm text-slate-500">
              Sık kullanılan cevapları kaydedin; sohbet ekranında tek tıkla kullanılır.
            </p>
            <SupportChatRepliesForm replies={replies} />
          </section>
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-800">Bildirimler</h2>
            <div className="rounded-lg border border-[#e9ebec] bg-white p-5 text-sm text-slate-600 shadow-sm">
              Bildirim kanalları (tarayıcı, e-posta, ses) bir sonraki adımda eklenecek. Şimdilik tüm
              sohbetler gelen kutusunda canlı listelenir.
            </div>
          </section>
        </>
      ) : (
        <SupportChatLockedCard />
      )}
    </SupportChatSettingsFrame>
  );
}
