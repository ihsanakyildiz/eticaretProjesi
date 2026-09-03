import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight, ScanBarcode } from "lucide-react";
import {
  ensureProductBarcodeUniqueIndex,
  findDuplicateBarcodeGroups,
} from "@/lib/product-barcode-db";
import { DuplicateBarcodesTable } from "../duplicate-barcodes-table";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tekrarlayan barkodlar",
  description: "Aynı barkoda sahip varyantları bulun ve düzeltin",
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function DuplicateBarcodesPage({ searchParams }: Props) {
  const params = await searchParams;
  const q = (firstParam(params.q) ?? "").trim();
  const page = Number.parseInt(firstParam(params.page) ?? "1", 10) || 1;
  const result = await findDuplicateBarcodeGroups({ q, page, pageSize: 25 });
  if (result.total === 0 && !q) {
    await ensureProductBarcodeUniqueIndex();
  }

  const hrefFor = (nextPage: number) => {
    const search = new URLSearchParams();
    if (q) search.set("q", q);
    if (nextPage > 1) search.set("page", String(nextPage));
    const query = search.toString();
    return query ? `/admin/products/duplicate-barcodes?${query}` : "/admin/products/duplicate-barcodes";
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <Link
          href="/admin/products"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Kataloğa dön
        </Link>
        <h1 className="mt-2 flex items-center gap-2 text-xl font-semibold text-slate-800 sm:text-2xl">
          <ScanBarcode className="h-6 w-6 text-[#405189]" />
          Tekrarlayan barkodlar
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          Her barkod yalnızca bir varyanta ait olabilir. Aşağıdaki kayıtları düzenleyip benzersiz
          barkod verin. Yeni kayıt ve XML/API aktarımları aynı barkodu ikinci kez yazmaz.
        </p>
        <form className="mt-4 flex flex-wrap gap-2" action="/admin/products/duplicate-barcodes">
          <input
            name="q"
            defaultValue={q}
            placeholder="Barkod, SKU veya ürün adı"
            className="min-w-[16rem] flex-1 rounded-md border border-[#e9ebec] px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-md bg-[#405189] px-4 py-2 text-sm font-semibold text-white"
          >
            Ara
          </button>
        </form>
      </div>

      {result.total === 0 ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-6 text-sm text-emerald-800">
          {q
            ? "Bu aramaya uyan tekrarlayan barkod yok."
            : "Tekrarlayan barkod kalmadı. Bundan sonra aynı barkod ikinci bir ürüne kaydedilemez."}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
            <p>
              {result.total.toLocaleString("tr-TR")} barkod birden fazla varyantta kullanılıyor.
            </p>
            <p className="text-xs text-slate-400">
              Sayfa {result.page} / {result.pageCount}
            </p>
          </div>
          <DuplicateBarcodesTable groups={result.groups} />
          {result.pageCount > 1 ? (
            <div className="flex items-center justify-end gap-2">
              {result.page > 1 ? (
                <Link
                  href={hrefFor(result.page - 1)}
                  className="inline-flex items-center gap-1 rounded-md border border-[#e9ebec] bg-white px-3 py-1.5 text-sm text-slate-600"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Önceki
                </Link>
              ) : null}
              {result.page < result.pageCount ? (
                <Link
                  href={hrefFor(result.page + 1)}
                  className="inline-flex items-center gap-1 rounded-md border border-[#e9ebec] bg-white px-3 py-1.5 text-sm text-slate-600"
                >
                  Sonraki
                  <ChevronRight className="h-4 w-4" />
                </Link>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
