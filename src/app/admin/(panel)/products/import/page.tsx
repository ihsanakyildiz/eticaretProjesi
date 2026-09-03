import type { Metadata } from "next";
import Link from "next/link";
import { FileSpreadsheet, Rss, Webhook } from "lucide-react";
import { ImportPageHeader, ImportSectionNav } from "./import-section-nav";
import { IMPORT_PATHS } from "./import-paths";

export const metadata: Metadata = {
  title: "Ürün yükle",
  description: "Excel, XML veya API ile ürün içe aktarın",
};

const CARDS = [
  {
    href: IMPORT_PATHS.excel,
    icon: FileSpreadsheet,
    title: "Excel",
    text: "Yeni ürün yükleyin veya mevcut ürünleri Excel ile güncelleyin.",
  },
  {
    href: IMPORT_PATHS.xml,
    icon: Rss,
    title: "XML kaynakları",
    text: "Kayıtlı tedarikçi XML’lerini yönetin. Her kaynağın kendi eşleme sayfası vardır.",
  },
  {
    href: IMPORT_PATHS.api,
    icon: Webhook,
    title: "API kaynakları",
    text: "JSON API’den ürün çekin, alanları eşleyin ve belirli aralıklarla güncelleyin.",
  },
] as const;

export default function ProductImportHubPage() {
  return (
    <div className="space-y-6">
      <ImportPageHeader
        title="Ürün yükle"
        description="Yeni ürün yükleyin, mevcut ürünleri Excel ile güncelleyin veya tedarikçi XML / API kaynaklarını zamanlayın. Aynı barkod veya ürün kodu kabul edilmez."
      />
      <ImportSectionNav />
      <div className="grid gap-4 md:grid-cols-3">
        {CARDS.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm transition hover:border-[#405189]/40 hover:shadow-md"
          >
            <card.icon className="h-6 w-6 text-[#405189]" />
            <h2 className="mt-3 text-base font-semibold text-slate-800">{card.title}</h2>
            <p className="mt-1 text-sm text-slate-500">{card.text}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
