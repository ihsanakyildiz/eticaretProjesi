import type { Metadata } from "next";
import { getLatestImportJob } from "@/lib/product-import-job";
import { kickImportWorker } from "@/lib/product-import-worker";
import { ProductImportClient } from "../product-import-client";
import { ExcelModeNav, ImportPageHeader, ImportSectionNav } from "../import-section-nav";

export const metadata: Metadata = {
  title: "Excel ile ürün yükle",
};

export default async function ExcelImportPage() {
  const initialJob = await getLatestImportJob().catch(() => null);
  if (initialJob && (initialJob.status === "QUEUED" || initialJob.status === "RUNNING")) {
    kickImportWorker();
  }

  return (
    <div className="space-y-6">
      <ImportPageHeader
        title="Excel ile ürün yükle"
        description="Kalıbı doldurup yeni ürünleri yükleyin. Aynı barkod veya ürün kodu kabul edilmez."
      />
      <ImportSectionNav />
      <ExcelModeNav />
      <ProductImportClient initialJob={initialJob} />
    </div>
  );
}
