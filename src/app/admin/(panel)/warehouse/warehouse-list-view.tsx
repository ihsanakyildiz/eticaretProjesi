import Link from "next/link";
import { Warehouse } from "lucide-react";
import { DuplicateBarcodeAlert } from "@/components/admin/duplicate-barcode-alert";
import { countDuplicateBarcodes } from "@/lib/product-barcode-db";
import {
  loadWarehouseOrderPage,
  parseWarehouseListQuery,
  type WarehouseListKind,
} from "@/lib/warehouse-list";
import { WarehouseOrdersTable } from "./warehouse-orders-table";

function tabClass(active: boolean) {
  return active
    ? "rounded-md bg-[#405189] px-3 py-2 text-sm font-semibold text-white"
    : "rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100";
}

export async function WarehouseListView({
  kind,
  searchParams,
}: {
  kind: WarehouseListKind;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const query = parseWarehouseListQuery(searchParams);
  const [list, duplicateBarcodeCount] = await Promise.all([
    loadWarehouseOrderPage({ kind, q: query.q, page: query.page }),
    countDuplicateBarcodes().catch(() => 0),
  ]);

  const emptyLabel =
    kind === "ready"
      ? query.q
        ? "Bu aramaya uyan gönderime hazır sipariş yok."
        : "Gönderime hazır sipariş yok."
      : query.q
        ? "Bu aramaya uyan kargolanmış sipariş yok."
        : "Henüz kargoya çıkarılan sipariş yok.";

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Mağaza</p>
        <h1 className="mt-1 flex items-center gap-2 text-xl font-semibold text-slate-800 sm:text-2xl">
          <Warehouse className="h-6 w-6 text-[#405189]" />
          Depo kargo transfer
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          {kind === "ready"
            ? "Ödemesi alınmış siparişleri okutarak paketleyin. Tüm satırlar tamamlanınca kargo barkodlu etiketi yazdırın."
            : "Kargoya çıkan siparişlerin etiketini tekrar yazdırın. Yanlış çıkışları gönderime hazır listesine geri alabilirsiniz."}
        </p>
        <nav className="mt-4 flex flex-wrap gap-2" aria-label="Depo listeleri">
          <Link href="/admin/warehouse" className={tabClass(kind === "ready")}>
            Gönderime hazır
            <span className="ml-1.5 tabular-nums opacity-80">
              ({list.readyCount.toLocaleString("tr-TR")})
            </span>
          </Link>
          <Link href="/admin/warehouse/shipped" className={tabClass(kind === "shipped")}>
            Kargolananlar
            <span className="ml-1.5 tabular-nums opacity-80">
              ({list.shippedCount.toLocaleString("tr-TR")})
            </span>
          </Link>
        </nav>
      </div>

      <DuplicateBarcodeAlert count={duplicateBarcodeCount} />

      {list.loadError ? (
        <div
          role="alert"
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
        >
          {list.loadError}
        </div>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-800">
            {kind === "ready" ? "Gönderime hazır" : "Kargolanan siparişler"}
          </h2>
          <p className="text-xs text-slate-400">
            {query.q
              ? `${list.total.toLocaleString("tr-TR")} sonuç`
              : `${list.total.toLocaleString("tr-TR")} sipariş`}
          </p>
        </div>
        <WarehouseOrdersTable
          kind={kind}
          rows={list.rows}
          emptyLabel={emptyLabel}
          actionLabel={kind === "ready" ? "Paketle" : "Etiket"}
          query={list.q}
          page={list.page}
          pageCount={list.pageCount}
          pageSize={list.pageSize}
          total={list.total}
        />
      </section>
    </div>
  );
}
