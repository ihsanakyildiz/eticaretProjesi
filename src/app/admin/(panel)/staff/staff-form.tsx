"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { Can } from "@/components/admin/admin-permissions";
import { AdminSwitch } from "@/components/admin/admin-switch";
import {
  ADMIN_PERMISSION_RESOURCES,
  PERMISSION_ACTIONS,
  emptyPermissionMap,
  type PermissionAction,
  type StaffPermissionMap,
} from "@/config/admin-permissions";
import {
  STAFF_PERMISSION_PRESETS,
  matchingPresetId,
  permissionMapForPreset,
  type PermissionPresetId,
} from "@/config/admin-permission-presets";
import { createStaffAction, updateStaffAction, type StaffFormState } from "./actions";

const inputClass =
  "w-full rounded-md border border-[#e9ebec] bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-[#0ab39c]";

const initialState: StaffFormState = {};

export type StaffDepartmentOption = {
  id: string;
  name: string;
  color: string;
};

export function StaffForm({
  mode,
  staff,
  departments = [],
}: {
  mode: "create" | "edit";
  staff?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    isActive: boolean;
    permissions: StaffPermissionMap;
    departmentIds?: string[];
  };
  departments?: StaffDepartmentOption[];
}) {
  const router = useRouter();
  const action = mode === "create" ? createStaffAction : updateStaffAction;
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [permissions, setPermissions] = useState<StaffPermissionMap>(
    staff?.permissions ?? emptyPermissionMap(),
  );
  const [departmentIds, setDepartmentIds] = useState<string[]>(staff?.departmentIds ?? []);

  useEffect(() => {
    if (state.success && state.redirectId) {
      router.push(`/admin/staff/${state.redirectId}`);
      router.refresh();
    }
  }, [state.success, state.redirectId, router]);

  const groups = useMemo(() => {
    const grouped = new Map<string, typeof ADMIN_PERMISSION_RESOURCES>();
    for (const resource of ADMIN_PERMISSION_RESOURCES) {
      const list = grouped.get(resource.group) ?? [];
      list.push(resource);
      grouped.set(resource.group, list);
    }
    return Array.from(grouped.entries());
  }, []);

  const toggle = (resourceId: string, actionName: PermissionAction, value: boolean) => {
    setPermissions((current) => ({
      ...current,
      [resourceId]: { ...current[resourceId], [actionName]: value },
    }));
  };

  const toggleRow = (resourceId: string, value: boolean) => {
    setPermissions((current) => ({
      ...current,
      [resourceId]: { view: value, create: value, update: value, delete: value },
    }));
  };

  const toggleColumn = (actionName: PermissionAction, value: boolean) => {
    setPermissions((current) => {
      const next = { ...current };
      for (const resource of ADMIN_PERMISSION_RESOURCES) {
        if (resource.id === "staff") continue;
        next[resource.id] = { ...next[resource.id], [actionName]: value };
      }
      return next;
    });
  };

  const allForAction = (actionName: PermissionAction) =>
    ADMIN_PERMISSION_RESOURCES.filter((resource) => resource.id !== "staff").every(
      (resource) => permissions[resource.id]?.[actionName],
    );

  const activePresetId = matchingPresetId(permissions);
  const applyPreset = (presetId: PermissionPresetId) => {
    setPermissions(permissionMapForPreset(presetId));
  };

  return (
    <form action={formAction} className="space-y-5">
      {mode === "edit" && staff ? <input type="hidden" name="id" value={staff.id} /> : null}
      <input type="hidden" name="permissionsJson" value={JSON.stringify(permissions)} />
      <input type="hidden" name="departmentIdsJson" value={JSON.stringify(departmentIds)} />

      {state.error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {state.error}
        </div>
      ) : null}
      {state.success && state.message ? (
        <div className="rounded-md border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">
          {state.message}
        </div>
      ) : null}

      <section className="space-y-4 rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-800">Hesap</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Ad *</span>
            <input name="firstName" defaultValue={staff?.firstName ?? ""} className={inputClass} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Soyad *</span>
            <input name="lastName" defaultValue={staff?.lastName ?? ""} className={inputClass} />
          </label>
          <label className="block md:col-span-2">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">E-posta *</span>
            <input name="email" type="email" defaultValue={staff?.email ?? ""} className={inputClass} />
          </label>
          <label className="block md:col-span-2">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
              {mode === "create" ? "Şifre *" : "Yeni şifre"}
            </span>
            <input
              name="password"
              type="password"
              className={inputClass}
              placeholder={mode === "edit" ? "Değiştirmek için doldurun" : ""}
            />
          </label>
          <AdminSwitch name="isActive" label="Hesap etkin" defaultChecked={staff?.isActive ?? true} />
        </div>
      </section>

      <section className="space-y-4 rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-base font-semibold text-slate-800">Sohbet departmanları</h2>
          <p className="mt-1 text-sm text-slate-500">
            Bu personelin bağlı olduğu sohbet departmanlarını işaretleyin. Departman listesi Sohbet
            ayarlarından yönetilir.
          </p>
        </div>
        {departments.length === 0 ? (
          <p className="rounded-md border border-dashed border-[#e9ebec] px-4 py-6 text-center text-sm text-slate-500">
            Henüz departman yok. Önce Sohbet ayarları → Ayarlar sayfasından ekleyin.
          </p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {departments.map((department) => {
              const checked = departmentIds.includes(department.id);
              return (
                <li key={department.id}>
                  <label className="flex cursor-pointer items-center gap-3 rounded-md border border-[#e9ebec] px-3 py-2.5 hover:bg-[#f8f9fa]">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => {
                        const next = event.target.checked;
                        setDepartmentIds((current) =>
                          next
                            ? [...current, department.id]
                            : current.filter((id) => id !== department.id),
                        );
                      }}
                    />
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: department.color }}
                      aria-hidden
                    />
                    <span className="text-sm font-medium text-slate-800">{department.name}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="overflow-hidden rounded-lg border border-[#e9ebec] bg-white shadow-sm">
        <div className="border-b border-[#e9ebec] px-5 py-4">
          <h2 className="text-base font-semibold text-slate-800">Sayfa yetkileri</h2>
          <p className="mt-1 text-sm text-slate-500">
            Hazır bir rol seçin, ardından kutuları isteğe göre düzeltin. Personel yönetimi yalnızca
            tam yöneticiye aittir.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {STAFF_PERMISSION_PRESETS.map((preset) => {
              const selected = activePresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset.id)}
                  className={`rounded-md border px-3 py-2 text-left transition ${
                    selected
                      ? "border-[#0ab39c] bg-[#0ab39c]/10 text-[#0ab39c]"
                      : "border-[#e9ebec] bg-white text-slate-700 hover:border-[#0ab39c]/50 hover:bg-[#f8f9fa]"
                  }`}
                >
                  <span className="block text-sm font-semibold">{preset.label}</span>
                  <span className={`mt-0.5 block text-[11px] leading-snug ${selected ? "text-[#0ab39c]/80" : "text-slate-500"}`}>
                    {preset.description}
                  </span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setPermissions(emptyPermissionMap())}
              className="rounded-md border border-[#e9ebec] bg-white px-3 py-2 text-left text-slate-600 transition hover:border-slate-300 hover:bg-[#f8f9fa]"
            >
              <span className="block text-sm font-semibold">Temizle</span>
              <span className="mt-0.5 block text-[11px] leading-snug text-slate-500">
                Tüm kutuları kaldır
              </span>
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-[#f3f6f9] text-xs font-semibold tracking-wide text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-2.5">Sayfa</th>
                {PERMISSION_ACTIONS.map((actionName) => (
                  <th key={actionName} className="px-3 py-2.5 text-center">
                    <label className="inline-flex flex-col items-center gap-1">
                      <span>
                        {actionName === "view"
                          ? "Görme"
                          : actionName === "create"
                            ? "Ekleme"
                            : actionName === "update"
                              ? "Düzenleme"
                              : "Silme"}
                      </span>
                      <input
                        type="checkbox"
                        checked={allForAction(actionName)}
                        onChange={(event) => toggleColumn(actionName, event.target.checked)}
                        aria-label={`Tüm ${actionName}`}
                      />
                    </label>
                  </th>
                ))}
                <th className="px-3 py-2.5 text-center">Tümü</th>
              </tr>
            </thead>
            <tbody>
              {groups.map(([group, resources]) => (
                <GroupRows
                  key={group}
                  group={group}
                  resources={resources}
                  permissions={permissions}
                  onToggle={toggle}
                  onToggleRow={toggleRow}
                />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="flex justify-between rounded-lg border border-[#e9ebec] bg-white p-4 shadow-sm">
        <Link
          href="/admin/staff"
          className="rounded-md border border-[#e9ebec] px-4 py-2.5 text-sm font-medium text-slate-600"
        >
          Listeye dön
        </Link>
        <Can resource="staff" action={mode === "create" ? "create" : "update"}>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-md bg-[#0ab39c] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-70"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {mode === "create" ? "Personeli kaydet" : "Güncelle"}
          </button>
        </Can>
      </div>
    </form>
  );
}

function GroupRows({
  group,
  resources,
  permissions,
  onToggle,
  onToggleRow,
}: {
  group: string;
  resources: typeof ADMIN_PERMISSION_RESOURCES;
  permissions: StaffPermissionMap;
  onToggle: (resourceId: string, action: PermissionAction, value: boolean) => void;
  onToggleRow: (resourceId: string, value: boolean) => void;
}) {
  return (
    <>
      <tr className="bg-[#f8f9fa]">
        <td colSpan={6} className="px-4 py-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
          {group}
        </td>
      </tr>
      {resources.map((resource) => {
        const flags = permissions[resource.id];
        const rowAll = flags.view && flags.create && flags.update && flags.delete;
        return (
          <tr key={resource.id} className="border-t border-[#e9ebec]">
            <td className="px-4 py-2 font-medium text-slate-800">
              {resource.label}
              {resource.hint ? (
                <span className="mt-0.5 block text-[11px] font-normal leading-snug text-slate-500">
                  {resource.hint}
                </span>
              ) : null}
            </td>
            {PERMISSION_ACTIONS.map((actionName) => (
              <td key={actionName} className="px-3 py-2 text-center">
                <input
                  type="checkbox"
                  checked={flags[actionName]}
                  disabled={resource.id === "staff"}
                  onChange={(event) => onToggle(resource.id, actionName, event.target.checked)}
                  aria-label={`${resource.label} ${actionName}`}
                />
              </td>
            ))}
            <td className="px-3 py-2 text-center">
              <input
                type="checkbox"
                checked={rowAll}
                disabled={resource.id === "staff"}
                onChange={(event) => onToggleRow(resource.id, event.target.checked)}
                aria-label={`${resource.label} tümü`}
              />
            </td>
          </tr>
        );
      })}
    </>
  );
}
