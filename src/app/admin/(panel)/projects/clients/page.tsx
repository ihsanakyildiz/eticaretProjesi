import type { Metadata } from "next";
import Link from "next/link";
import { Building2, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ProjectClientsTable } from "./clients-table";

export const metadata: Metadata = {
  title: "Proje Müşterileri",
  description: "Portföy müşterilerini yönetin",
};

export default async function ProjectClientsPage() {
  const clients = await prisma.projectClient.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      sector: true,
      logo: true,
      website: true,
      isActive: true,
      sortOrder: true,
      _count: { select: { projects: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
              Projeler
            </p>
            <h1 className="mt-1 flex items-center gap-2 text-xl font-semibold text-slate-800 sm:text-2xl">
              <Building2 className="h-6 w-6 text-[#405189]" />
              Müşteriler
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Müşteri kayıtlarını buradan yönetin. Bir müşteriye birden fazla proje bağlayabilirsiniz.
            </p>
          </div>
          <Link
            href="/admin/projects/clients/new"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-[#0ab39c] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#099885]"
          >
            <Plus className="h-4 w-4" />
            Yeni Müşteri
          </Link>
        </div>
      </div>

      <ProjectClientsTable clients={clients} />
    </div>
  );
}
