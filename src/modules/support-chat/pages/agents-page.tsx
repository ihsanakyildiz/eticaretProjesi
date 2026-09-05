import { SupportChatLockedCard } from "@/modules/support-chat/components/locked-card";
import {
  listAssignableStaff,
  listSupportChatStaffDepartmentNamesByUser,
} from "@/modules/support-chat/db";
import { isSupportChatLicensed } from "@/modules/support-chat/license";
import { SupportChatSettingsFrame } from "@/modules/support-chat/pages/settings-frame";

export async function SupportChatAgentsPage() {
  const licensed = await isSupportChatLicensed();
  const staff = licensed ? await listAssignableStaff() : [];
  const departmentsByUser = licensed
    ? await listSupportChatStaffDepartmentNamesByUser(staff.map((person) => person.id))
    : {};
  return (
    <SupportChatSettingsFrame
      title="Temsilciler"
      description="Sohbet ataması mevcut personel hesaplarından yapılır. Departman ataması Personel sayfasından yapılır."
    >
      {licensed ? (
        <div className="overflow-hidden rounded-lg border border-[#e9ebec] bg-white shadow-sm">
          {staff.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-500">Personel bulunamadı.</p>
          ) : (
            <ul className="divide-y divide-[#e9ebec]">
              {staff.map((person) => {
                const departments = departmentsByUser[person.id] ?? [];
                return (
                  <li key={person.id} className="px-4 py-3">
                    <p className="font-medium text-slate-800">{person.name || "İsimsiz"}</p>
                    <p className="text-xs text-slate-500">{person.email}</p>
                    {departments.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {departments.map((department) => (
                          <span
                            key={department.name}
                            className="inline-flex items-center gap-1.5 rounded-full bg-[#f3f6f9] px-2 py-0.5 text-[11px] font-medium text-slate-600"
                          >
                            <span
                              className="h-1.5 w-1.5 rounded-full"
                              style={{ backgroundColor: department.color }}
                              aria-hidden
                            />
                            {department.name}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : (
        <SupportChatLockedCard />
      )}
    </SupportChatSettingsFrame>
  );
}
