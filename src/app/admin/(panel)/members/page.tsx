import type { Metadata } from "next";
import Link from "next/link";
import { Pencil, Trash2, UserCheck, UserX, Users } from "lucide-react";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { deleteMemberAction, toggleMemberActiveAction } from "./actions";

export const metadata: Metadata = {
  title: "Üyeler",
};

export default async function MembersPage() {
  const members = await prisma.user.findMany({
    where: { role: Role.MEMBER },
    orderBy: { createdAt: "desc" },
    include: {
      subscriptions: {
        where: { status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] } },
        include: { pricingPlan: { select: { name: true } } },
        take: 1,
      },
      _count: { select: { subscriptions: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Sistem</p>
        <h1 className="mt-1 flex items-center gap-2 text-xl font-semibold text-slate-800 sm:text-2xl">
          <Users className="h-6 w-6 text-[#0ab39c]" />
          Üyeler
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Paket satın alan ve kayıt olan müşteri hesaplarını yönetin.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-[#e9ebec] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[#e9ebec] bg-[#f8fafc] text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Üye</th>
                <th className="px-4 py-3 font-medium">Durum</th>
                <th className="px-4 py-3 font-medium">Abonelik</th>
                <th className="px-4 py-3 font-medium">Kayıt</th>
                <th className="px-4 py-3 font-medium text-right">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {members.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                    Henüz üye yok.
                  </td>
                </tr>
              ) : (
                members.map((member) => (
                  <tr key={member.id} className="border-b border-[#e9ebec] last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{member.name || "—"}</p>
                      <p className="text-xs text-slate-500">{member.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      {member.isActive ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          <UserCheck className="h-3.5 w-3.5" />
                          Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                          <UserX className="h-3.5 w-3.5" />
                          Pasif
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {member.subscriptions[0]?.pricingPlan.name ??
                        (member._count.subscriptions > 0 ? "Geçmiş abonelik" : "—")}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Intl.DateTimeFormat("tr-TR", {
                        dateStyle: "medium",
                      }).format(member.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Link
                          href={`/admin/members/${member.id}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#e9ebec] text-slate-600 hover:bg-slate-50"
                          title="Düzenle"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                        <form action={toggleMemberActiveAction}>
                          <input type="hidden" name="id" value={member.id} />
                          <button
                            type="submit"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#e9ebec] text-slate-600 hover:bg-slate-50"
                            title={member.isActive ? "Pasifleştir" : "Aktifleştir"}
                          >
                            {member.isActive ? (
                              <UserX className="h-4 w-4" />
                            ) : (
                              <UserCheck className="h-4 w-4" />
                            )}
                          </button>
                        </form>
                        <form action={deleteMemberAction}>
                          <input type="hidden" name="id" value={member.id} />
                          <button
                            type="submit"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-rose-200 text-rose-600 hover:bg-rose-50"
                            title="Sil"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
