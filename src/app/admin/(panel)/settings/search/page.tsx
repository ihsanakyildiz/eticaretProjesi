import type { Metadata } from "next";
import { Search } from "lucide-react";
import { ensureSearchTermsTable } from "@/lib/ensure-search-schema";
import { prisma } from "@/lib/prisma";
import { SearchTermsTable } from "./search-terms-table";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Arama motoru",
  description: "Mağaza arama terimlerini ve puanlarını yönetin",
};

export default async function SearchSettingsPage() {
  await ensureSearchTermsTable().catch(() => undefined);
  const terms = await prisma.searchTerm
    .findMany({
      orderBy: [{ score: "desc" }, { searchCount: "desc" }, { displayTerm: "asc" }],
      select: {
        id: true,
        displayTerm: true,
        term: true,
        score: true,
        searchCount: true,
        isActive: true,
        updatedAt: true,
      },
    })
    .catch(() => []);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
          Ayarlar
        </p>
        <h1 className="mt-1 flex items-center gap-2 text-xl font-semibold text-slate-800 sm:text-2xl">
          <Search className="h-6 w-6 text-[#405189]" />
          Arama motoru
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-500">
          Müşteri yazmaya başladığında ürün, kategori, marka ve bu listedeki terimler
          önerilir. Puanı yükseltmek terimi önerilerde ve popüler aramalarda yukarı taşır.
          Arama sayısı müşterilerin gerçek aramalarından otomatik artar.
        </p>
      </div>

      <SearchTermsTable
        terms={terms.map((term) => ({
          ...term,
          updatedAt: term.updatedAt.toISOString(),
        }))}
      />
    </div>
  );
}
