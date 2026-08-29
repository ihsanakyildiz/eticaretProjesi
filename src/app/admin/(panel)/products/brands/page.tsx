import type { Metadata } from "next";
import Link from "next/link";
import { Award, Plus } from "lucide-react";
import { Can } from "@/components/admin/admin-permissions";
import { prisma } from "@/lib/prisma";
import { BrandsTable } from "./brands-table";

export const metadata: Metadata = {
  title: "Markalar",
  description: "Ürün markalarını yönetin",
};

export default async function ProductBrandsPage() {
  const brands = await prisma.brand.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      tagline: true,
      country: true,
      logo: true,
      banner: true,
      isActive: true,
      sortOrder: true,
      _count: { select: { products: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
              Mağaza
            </p>
            <h1 className="mt-1 flex items-center gap-2 text-xl font-semibold text-slate-800 sm:text-2xl">
              <Award className="h-6 w-6 text-[#405189]" />
              Markalar
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Logo, slogan ve açıklamaları buradan yönetin. Ürünler oluşturulurken markaya
              bağlanabilir.
            </p>
          </div>
          <Can resource="brands" action="create">
            <Link
              href="/admin/products/brands/new"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-[#0ab39c] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#099885]"
            >
              <Plus className="h-4 w-4" />
              Yeni Marka
            </Link>
          </Can>
        </div>
      </div>

      <BrandsTable brands={brands} />
    </div>
  );
}
