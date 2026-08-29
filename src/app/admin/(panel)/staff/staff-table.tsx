"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Can } from "@/components/admin/admin-permissions";
import { formatOrderDateTime } from "@/lib/orders";
import { deleteStaffAction } from "./actions";

export type StaffRow = {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  lastLoginAt: string | null;
};

export function StaffTable({ staff }: { staff: StaffRow[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const remove = (id: string) => {
    if (!window.confirm("Bu personel silinecek. Devam edilsin mi?")) return;
    startTransition(async () => {
      const result = await deleteStaffAction({ id });
      if (result.error) {
        setError(result.error);
        return;
      }
      setError(null);
      router.refresh();
    });
  };

  return (
    <div className="rounded-lg border border-[#e9ebec] bg-white shadow-sm">
      {error ? (
        <div className="border-b border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</div>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-[#f3f6f9] text-xs font-semibold tracking-wide text-slate-500 uppercase">
            <tr>
              <th className="px-4 py-2.5">Ad</th>
              <th className="px-4 py-2.5">E-posta</th>
              <th className="px-4 py-2.5">Durum</th>
              <th className="px-4 py-2.5">Son giriş</th>
              <th className="px-4 py-2.5 text-right">Eylemler</th>
            </tr>
          </thead>
          <tbody>
            {staff.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                  Henüz personel yok.
                </td>
              </tr>
            ) : (
              staff.map((row) => (
                <tr key={row.id} className="border-t border-[#e9ebec]">
                  <td className="px-4 py-2.5 font-medium text-slate-800">{row.name}</td>
                  <td className="px-4 py-2.5 text-slate-600">{row.email}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`rounded px-2 py-0.5 text-[11px] font-semibold ${
                        row.isActive ? "bg-[#0ab39c] text-white" : "bg-slate-400 text-white"
                      }`}
                    >
                      {row.isActive ? "Etkin" : "Pasif"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">
                    {row.lastLoginAt ? formatOrderDateTime(row.lastLoginAt) : "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-1">
                      <Can resource="staff" action="update">
                        <Link
                          href={`/admin/staff/${row.id}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#e9ebec] text-slate-500 hover:text-[#405189]"
                          title="Düzenle"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Link>
                      </Can>
                      <Can resource="staff" action="delete">
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => remove(row.id)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#e9ebec] text-slate-500 hover:text-rose-600"
                          title="Sil"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </Can>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
