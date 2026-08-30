import type { Metadata } from "next";
import { Upload } from "lucide-react";
import { getLatestImportJob } from "@/lib/product-import-job";
import { kickImportWorker } from "@/lib/product-import-worker";
import { ProductImportClient } from "./product-import-client";

export const metadata: Metadata = {
  title: "Ürün yükle",
  description: "Excel, XML veya API ile ürün içe aktarın",
};

export default async function ProductImportPage() {
  const initialJob = await getLatestImportJob().catch(() => null);
  if (initialJob && (initialJob.status === "QUEUED" || initialJob.status === "RUNNING")) {
    kickImportWorker();
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Mağaza</p>
        <h1 className="mt-1 flex items-center gap-2 text-xl font-semibold text-slate-800 sm:text-2xl">
          <Upload className="h-6 w-6 text-[#405189]" />
          Ürün yükle
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-500">
          Excel kalıbını indirip yükleyin. Görsel linkleri bu sunucuya indirilir; açılmayan
          linkli ürün yüklenmez. Ürünler toplu kaydedilir. Aktarım bitince Excel satır
          verisi silinir.
        </p>
      </div>
      <ProductImportClient initialJob={initialJob} />
    </div>
  );
}
