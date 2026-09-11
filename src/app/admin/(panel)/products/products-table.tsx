"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Loader2,
  Pencil,
  Power,
  RotateCcw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { Can, useCan } from "@/components/admin/admin-permissions";
import { AdminPublicTextLink } from "@/components/admin/admin-public-link";
import { SearchableSelect } from "@/components/admin/searchable-select";
import {
  ADMIN_PRODUCT_ADDED,
  ADMIN_PRODUCT_IMAGES,
  ADMIN_PRODUCT_NONE,
  ADMIN_PRODUCT_ON_SALES,
  ADMIN_PRODUCT_SALES,
  ADMIN_PRODUCT_STATUSES,
  ADMIN_PRODUCT_STOCKS,
  ADMIN_PRODUCT_VISIBILITIES,
  adminProductAddedLabel,
  adminProductCatalogHref,
  adminProductImageLabel,
  adminProductListHasFilters,
  adminProductOnSaleLabel,
  adminProductSaleLabel,
  adminProductStatusLabel,
  adminProductStockLabel,
  adminProductVisibilityLabel,
  emptyAdminProductListQuery,
  parseAdminProductListQuery,
  type AdminProductListLookups,
  type AdminProductListQuery,
  type ProductRow,
} from "@/lib/admin-product-list";
import { formatMinorToMajorInput, formatMinorTry, parseMajorToMinor } from "@/lib/product-money";
import { hasStoredCampaign } from "@/lib/product-sale";
import { publicProductHref } from "@/lib/public-urls";
import { DEFAULT_URL_STRUCTURE, type UrlStructure } from "@/lib/url-structure";
import {
  deleteProductAction,
  duplicateProductAction,
  toggleProductActiveAction,
  toggleVariantFeedSyncLockAction,
  updateProductVariantQuickAction,
  type ProductSaleResult,
} from "./actions";
import { ProductListVariantsPanel } from "./product-list-expand";
import { FEED_SYNC_LOCK_TITLE, FeedSyncLockCheckbox } from "./product-list-feed-lock";
import { ProductSaleModal, SalePlusButton, type ProductSaleTarget } from "./product-list-sale-modal";
import { QuickEditCell } from "./product-list-quick-edit";

export type { ProductRow };

const selectClass =
  "w-full rounded-md border border-[#e9ebec] bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-[#0ab39c] focus:ring-2 focus:ring-[#0ab39c]/20";

function formatAddedAt(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (sameDay) {
    return date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString("tr-TR");
}

function DeleteProductModal({
  product,
  isPending,
  error,
  onClose,
  onConfirm,
}: {
  product: ProductRow;
  isPending: boolean;
  error?: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isPending) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isPending, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Kapat"
        className="absolute inset-0 bg-slate-900/50"
        disabled={isPending}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-md overflow-hidden rounded-xl border border-[#e9ebec] bg-white shadow-xl"
      >
        <div className="flex items-start gap-3 border-b border-[#e9ebec] px-5 py-4">
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-slate-800">Ürünü sil</h2>
            <p className="mt-1 text-sm text-slate-500">Bu işlem geri alınamaz.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 px-5 py-4">
          <p className="text-sm leading-relaxed text-slate-600">
            <strong className="font-semibold text-slate-800">{product.title}</strong> ürününü silmek
            istediğinize emin misiniz?
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-500">
            <li>Ürün, kombinasyonları ve görselleri kalıcı olarak silinecek.</li>
            {product.variantCount > 1 ? (
              <li>{product.variantCount} SKU satırı kaldırılacak.</li>
            ) : null}
          </ul>
          {error ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-[#e9ebec] bg-[#f3f6f9] px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-md border border-[#e9ebec] bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
          >
            Vazgeç
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-md bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-70"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Evet, Sil
          </button>
        </div>
      </div>
    </div>
  );
}

function ProductsFilterBar({
  query,
  lookups,
}: {
  query: AdminProductListQuery;
  lookups: AdminProductListLookups;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(query);
  const hasFilters = adminProductListHasFilters(draft);

  useEffect(() => {
    setDraft(query);
  }, [query]);

  const categoryOptions = useMemo(
    () => [
      { id: ADMIN_PRODUCT_NONE, label: "Kategorisiz" },
      ...lookups.categories.map((item) => ({
        id: item.id,
        label: item.label,
        depth: item.depth,
      })),
    ],
    [lookups.categories],
  );
  const brandOptions = useMemo(
    () => [
      { id: ADMIN_PRODUCT_NONE, label: "Markasız" },
      ...lookups.brands.map((item) => ({ id: item.id, label: item.label })),
    ],
    [lookups.brands],
  );
  const supplierOptions = useMemo(
    () => [
      { id: ADMIN_PRODUCT_NONE, label: "Tedarikçisiz" },
      ...lookups.suppliers.map((item) => ({ id: item.id, label: item.label })),
    ],
    [lookups.suppliers],
  );

  function apply(next: AdminProductListQuery) {
    setDraft(next);
    router.push(adminProductCatalogHref({ ...next, page: 1 }, 1));
  }

  function submitForm(form: HTMLFormElement) {
    const data = new FormData(form);
    apply(
      parseAdminProductListQuery({
        q: String(data.get("q") ?? ""),
        code: String(data.get("code") ?? ""),
        categoryId: String(data.get("categoryId") ?? ""),
        brandId: String(data.get("brandId") ?? ""),
        supplierId: String(data.get("supplierId") ?? ""),
        status: String(data.get("status") ?? ""),
        sale: String(data.get("sale") ?? ""),
        stock: String(data.get("stock") ?? ""),
        visibility: String(data.get("visibility") ?? ""),
        image: String(data.get("image") ?? ""),
        onSale: String(data.get("onSale") ?? ""),
        added: String(data.get("added") ?? ""),
      }),
    );
  }

  return (
    <form
      action="/admin/products"
      method="get"
      onSubmit={(event) => {
        event.preventDefault();
        submitForm(event.currentTarget);
      }}
      className="space-y-4 border-b border-[#e9ebec] px-4 py-4"
    >
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-slate-500">Arama</span>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              name="q"
              value={draft.q}
              onChange={(event) => setDraft((prev) => ({ ...prev, q: event.target.value }))}
              placeholder="Ürün adı, marka, kategori veya tedarikçi…"
              className="w-full rounded-md border border-[#e9ebec] bg-white py-2.5 pr-3 pl-9 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#0ab39c] focus:ring-2 focus:ring-[#0ab39c]/20"
            />
          </div>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-slate-500">SKU / barkod / kod</span>
          <input
            type="search"
            name="code"
            value={draft.code}
            onChange={(event) => setDraft((prev) => ({ ...prev, code: event.target.value }))}
            placeholder="SKU, barkod, XML kodu, GTIN veya ürün no"
            className="w-full rounded-md border border-[#e9ebec] bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#0ab39c] focus:ring-2 focus:ring-[#0ab39c]/20"
          />
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <div>
          <span className="mb-1.5 block text-xs font-medium text-slate-500">Kategori</span>
          <SearchableSelect
            name="categoryId"
            value={draft.categoryId}
            onChange={(categoryId) => apply({ ...draft, categoryId, page: 1 })}
            options={categoryOptions}
            placeholder="Kategori ara veya seçin…"
            emptyLabel="— Tüm kategoriler —"
            searchPlaceholder="Kategori ara…"
            noResultsLabel="Eşleşen kategori yok"
          />
        </div>
        <div>
          <span className="mb-1.5 block text-xs font-medium text-slate-500">Marka</span>
          <SearchableSelect
            name="brandId"
            value={draft.brandId}
            onChange={(brandId) => apply({ ...draft, brandId, page: 1 })}
            options={brandOptions}
            placeholder="Marka ara veya seçin…"
            emptyLabel="— Tüm markalar —"
            searchPlaceholder="Marka ara…"
            noResultsLabel="Eşleşen marka yok"
          />
        </div>
        <div>
          <span className="mb-1.5 block text-xs font-medium text-slate-500">Tedarikçi</span>
          <SearchableSelect
            name="supplierId"
            value={draft.supplierId}
            onChange={(supplierId) => apply({ ...draft, supplierId, page: 1 })}
            options={supplierOptions}
            placeholder="Tedarikçi ara veya seçin…"
            emptyLabel="— Tüm tedarikçiler —"
            searchPlaceholder="Tedarikçi ara…"
            noResultsLabel="Eşleşen tedarikçi yok"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-slate-500">Durum</span>
          <select
            name="status"
            className={selectClass}
            value={draft.status}
            onChange={(event) =>
              apply({ ...draft, status: parseAdminProductListQuery({ status: event.target.value }).status })
            }
          >
            {ADMIN_PRODUCT_STATUSES.map((value) => (
              <option key={value} value={value}>
                {adminProductStatusLabel(value)}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-slate-500">Satış</span>
          <select
            name="sale"
            className={selectClass}
            value={draft.sale}
            onChange={(event) =>
              apply({ ...draft, sale: parseAdminProductListQuery({ sale: event.target.value }).sale })
            }
          >
            {ADMIN_PRODUCT_SALES.map((value) => (
              <option key={value} value={value}>
                {adminProductSaleLabel(value)}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-slate-500">Stok</span>
          <select
            name="stock"
            className={selectClass}
            value={draft.stock}
            onChange={(event) =>
              apply({ ...draft, stock: parseAdminProductListQuery({ stock: event.target.value }).stock })
            }
          >
            {ADMIN_PRODUCT_STOCKS.map((value) => (
              <option key={value} value={value}>
                {adminProductStockLabel(value)}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-slate-500">Eklenme</span>
          <select
            name="added"
            className={selectClass}
            value={draft.added}
            onChange={(event) =>
              apply({ ...draft, added: parseAdminProductListQuery({ added: event.target.value }).added })
            }
          >
            {ADMIN_PRODUCT_ADDED.map((value) => (
              <option key={value} value={value}>
                {adminProductAddedLabel(value)}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-slate-500">Görünürlük</span>
          <select
            name="visibility"
            className={selectClass}
            value={draft.visibility}
            onChange={(event) =>
              apply({
                ...draft,
                visibility: parseAdminProductListQuery({ visibility: event.target.value }).visibility,
              })
            }
          >
            {ADMIN_PRODUCT_VISIBILITIES.map((value) => (
              <option key={value} value={value}>
                {adminProductVisibilityLabel(value)}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-slate-500">Görsel</span>
          <select
            name="image"
            className={selectClass}
            value={draft.image}
            onChange={(event) =>
              apply({ ...draft, image: parseAdminProductListQuery({ image: event.target.value }).image })
            }
          >
            {ADMIN_PRODUCT_IMAGES.map((value) => (
              <option key={value} value={value}>
                {adminProductImageLabel(value)}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-slate-500">İndirim</span>
          <select
            name="onSale"
            className={selectClass}
            value={draft.onSale}
            onChange={(event) =>
              apply({ ...draft, onSale: parseAdminProductListQuery({ onSale: event.target.value }).onSale })
            }
          >
            {ADMIN_PRODUCT_ON_SALES.map((value) => (
              <option key={value} value={value}>
                {adminProductOnSaleLabel(value)}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-[#405189] px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-[#364574]"
          >
            <Search className="h-4 w-4" />
            Ara
          </button>
          <button
            type="button"
            disabled={!hasFilters}
            onClick={() => apply(emptyAdminProductListQuery())}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-[#e9ebec] px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RotateCcw className="h-4 w-4" />
            Sıfırla
          </button>
        </div>
      </div>
    </form>
  );
}

export function ProductsTable({
  products,
  query,
  lookups,
  page,
  pageCount,
  total,
  pageSize,
  urlStructure = DEFAULT_URL_STRUCTURE,
  advancedInventory = false,
}: {
  products: ProductRow[];
  query: AdminProductListQuery;
  lookups: AdminProductListLookups;
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  urlStructure?: UrlStructure;
  advancedInventory?: boolean;
}) {
  const canCreate = useCan("products", "create");
  const canUpdate = useCan("products", "update");
  const canDelete = useCan("products", "delete");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<ProductRow | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [stockOverrides, setStockOverrides] = useState<Record<string, number>>({});
  const [priceOverrides, setPriceOverrides] = useState<Record<string, number>>({});
  const [salePatches, setSalePatches] = useState<
    Record<
      string,
      {
        priceMinor: number;
        compareAtMinor: number | null;
        saleStartsAt: string | null;
        saleEndsAt: string | null;
      }
    >
  >({});
  const [saleTarget, setSaleTarget] = useState<ProductSaleTarget | null>(null);
  const [feedLockOverrides, setFeedLockOverrides] = useState<Record<string, boolean>>({});
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const confirmDelete = () => {
    if (!deleteTarget) return;
    startTransition(async () => {
      const result = await deleteProductAction({ id: deleteTarget.id });
      if (result.error) {
        setActionError(result.error);
        return;
      }
      setDeleteTarget(null);
      setActionError(null);
      router.refresh();
    });
  };

  const duplicateProduct = (product: ProductRow) => {
    startTransition(async () => {
      const result = await duplicateProductAction({ id: product.id });
      if (result.error) {
        setActionError(result.error);
        return;
      }
      setActionError(null);
      if (result.redirectId) {
        router.push(`/admin/products/${result.redirectId}/edit`);
        return;
      }
      router.refresh();
    });
  };

  const toggleActive = (product: ProductRow) => {
    startTransition(async () => {
      const result = await toggleProductActiveAction({
        id: product.id,
        isActive: !product.isActive,
      });
      if (result.error) {
        setActionError(result.error);
        return;
      }
      setActionError(null);
      router.refresh();
    });
  };

  const toggleFeedLock = (product: ProductRow, next: boolean) => {
    if (!product.defaultVariantId) return;
    setFeedLockOverrides((prev) => ({ ...prev, [product.id]: next }));
    startTransition(async () => {
      const result = await toggleVariantFeedSyncLockAction({
        variantId: product.defaultVariantId!,
        feedSyncLocked: next,
      });
      if (result.error) {
        setFeedLockOverrides((prev) => ({ ...prev, [product.id]: !next }));
        setActionError(result.error);
        return;
      }
      setActionError(null);
    });
  };

  const toggleExpanded = (productId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const saveSimpleVariant = (
    product: ProductRow,
    patch: { priceMinor?: number; stockQuantity?: number },
  ) => {
    if (!product.defaultVariantId) {
      return Promise.resolve({ error: "Bu ürünün stok kaydı yok." });
    }
    return updateProductVariantQuickAction({
      variantId: product.defaultVariantId,
      ...patch,
    })
      .then((result) => {
        if (result.error || !result.variant) {
          return { error: result.error ?? "Kayıt güncellenemedi." };
        }
        if (patch.priceMinor !== undefined) {
          setPriceOverrides((prev) => ({ ...prev, [product.id]: result.variant!.priceMinor }));
          setSalePatches((prev) => {
            const current = prev[product.id];
            if (!current) return prev;
            return {
              ...prev,
              [product.id]: { ...current, priceMinor: result.variant!.priceMinor },
            };
          });
          return { savedValue: formatMinorToMajorInput(result.variant.priceMinor) };
        }
        if (patch.stockQuantity !== undefined) {
          setStockOverrides((prev) => ({ ...prev, [product.id]: result.variant!.stockQuantity }));
          return { savedValue: String(result.variant.stockQuantity) };
        }
        return {};
      })
      .catch(() => ({ error: "Kayıt güncellenemedi." }));
  };

  const applySaleResult = (result: ProductSaleResult) => {
    if (!result.product) return;
    setPriceOverrides((prev) => ({ ...prev, [result.product!.id]: result.product!.basePriceMinor }));
    setSalePatches((prev) => ({
      ...prev,
      [result.product!.id]: {
        priceMinor: result.product!.basePriceMinor,
        compareAtMinor: result.product!.compareAtMinor,
        saleStartsAt: result.product!.saleStartsAt,
        saleEndsAt: result.product!.saleEndsAt,
      },
    }));
  };

  const productGridClass =
    "grid grid-cols-[minmax(0,2fr)_110px_minmax(0,1fr)_130px_100px_48px_44px_176px_40px] gap-2";

  return (
    <>
      <div className="rounded-lg border border-[#e9ebec] bg-white shadow-sm">
        <ProductsFilterBar query={query} lookups={lookups} />
        <div className="flex items-center justify-between border-b border-[#e9ebec] px-4 py-2.5">
          <p className="text-xs text-slate-400">
            {total === 0 ? "0 ürün" : `${from}–${to} / ${total.toLocaleString("tr-TR")} ürün`}
          </p>
          <p className="text-xs text-slate-400">En yeni üstte</p>
        </div>

        {actionError ? (
          <div className="border-b border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
            {actionError}
          </div>
        ) : null}

        {products.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <p className="text-sm text-slate-500">
              {adminProductListHasFilters(query)
                ? "Filtrelere uygun ürün yok."
                : "Henüz ürün eklenmemiş."}
            </p>
            {!adminProductListHasFilters(query) && canCreate ? (
              <Link
                href="/admin/products/new"
                className="mt-4 inline-flex text-sm font-medium text-[#405189] hover:underline"
              >
                İlk ürünü ekle →
              </Link>
            ) : null}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[1030px]">
              <div className={`${productGridClass} border-b border-[#e9ebec] bg-[#f3f6f9] px-4 py-2.5 text-xs font-semibold tracking-wide text-slate-500 uppercase`}>
                <span>Ürün</span>
                <span>SKU</span>
                <span>Kategori</span>
                <span>Fiyat</span>
                <span>Stok</span>
                <span title={FEED_SYNC_LOCK_TITLE}>Koru</span>
                <span>Durum</span>
                <span className="text-right">İşlem</span>
                <span className="sr-only">Varyantlar</span>
              </div>

              {products.map((product) => {
                const hasVariants = product.variantCount > 1;
                const expanded = expandedIds.has(product.id);
                const stockQuantity = stockOverrides[product.id] ?? product.stockQuantity;
                const salePatch = salePatches[product.id];
                const priceMinor = salePatch?.priceMinor ?? priceOverrides[product.id] ?? product.basePriceMinor;
                const compareAtMinor = salePatch?.compareAtMinor ?? product.compareAtMinor;
                const saleStartsAt = salePatch?.saleStartsAt ?? product.saleStartsAt;
                const saleEndsAt = salePatch?.saleEndsAt ?? product.saleEndsAt;
                const canQuickEdit = Boolean(product.defaultVariantId) && canUpdate;
                const campaignOn = hasStoredCampaign({
                  priceMinor,
                  compareAtMinor,
                  saleStartsAt,
                  saleEndsAt,
                });
                const openSale = () => {
                  if (!product.defaultVariantId || !canUpdate) return;
                  setSaleTarget({
                    variantId: product.defaultVariantId,
                    productId: product.id,
                    title: product.title,
                    priceMinor,
                    compareAtMinor,
                    saleStartsAt,
                    saleEndsAt,
                    canApplyAll: product.variantCount > 1,
                  });
                };
                return (
                <div key={product.id}>
                <div
                  className={`${productGridClass} items-start border-b border-[#e9ebec] px-4 py-3 text-sm ${expanded ? "" : "last:border-0"}`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-[#f3f6f9]">
                      {product.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={product.image} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-[10px] font-semibold text-[#405189]">
                          {product.title.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-800">
                        <AdminPublicTextLink
                          href={publicProductHref(product.slug, urlStructure, product.urlId)}
                        >
                          {product.title}
                        </AdminPublicTextLink>
                      </p>
                      <p className="truncate text-xs text-slate-400">
                        {product.brandName || product.slug}
                        {product.supplierName ? ` · ${product.supplierName}` : ""}
                        {product.variantCount > 1 ? ` · ${product.variantCount} kombinasyon` : ""}
                        {` · ${formatAddedAt(product.createdAt)}`}
                      </p>
                      {product.campaignName ? (
                        <p className="mt-1 truncate">
                          <span className="inline-flex max-w-full items-center rounded bg-rose-50 px-1.5 py-0.5 text-[11px] font-semibold text-rose-700">
                            {product.campaignLabel || product.campaignName}
                          </span>
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <span className="truncate pt-1.5 font-mono text-xs text-slate-500">
                    {product.sku || "—"}
                  </span>
                  <span className="truncate pt-1.5 text-slate-500">{product.categoryName || "—"}</span>
                  {hasVariants ? (
                  <div className="flex items-start gap-1 pt-1.5 text-slate-700">
                    <span className="min-w-0 truncate font-medium">{formatMinorTry(priceMinor)}</span>
                    <SalePlusButton
                      active={campaignOn}
                      disabled={!canQuickEdit}
                      label={`${product.title} indirim`}
                      onClick={openSale}
                    />
                  </div>
                  ) : (
                    <div>
                      <QuickEditCell
                        savedValue={formatMinorToMajorInput(priceMinor)}
                        ariaLabel={`${product.title} fiyat`}
                        inputMode="decimal"
                        disabled={!canQuickEdit}
                        trailing={
                          <SalePlusButton
                            active={campaignOn}
                            disabled={!canQuickEdit}
                            label={`${product.title} indirim`}
                            onClick={openSale}
                          />
                        }
                        formatGhost={(value) => {
                          const minor = parseMajorToMinor(value);
                          return minor == null ? value : formatMinorTry(minor);
                        }}
                        normalize={(raw) => {
                          const minor = parseMajorToMinor(raw);
                          if (minor == null) return { ok: false, error: "Geçerli fiyat girin" };
                          return { ok: true, value: formatMinorToMajorInput(minor) };
                        }}
                        onCommit={(value) => {
                          const minor = parseMajorToMinor(value);
                          if (minor == null) return Promise.resolve({ error: "Geçerli fiyat girin" });
                          return saveSimpleVariant(product, { priceMinor: minor });
                        }}
                      />
                    </div>
                  )}
                  {hasVariants ? (
                  <span
                    className={`pt-1.5 ${
                      stockQuantity > 0
                        ? "font-medium text-[#0ab39c]"
                        : "font-medium text-rose-600"
                    }`}
                  >
                    {stockQuantity}
                  </span>
                  ) : (
                    <QuickEditCell
                      savedValue={String(stockQuantity)}
                      ariaLabel={`${product.title} stok`}
                      inputMode="numeric"
                      disabled={!canQuickEdit || advancedInventory}
                      formatGhost={(value) => value}
                      normalize={(raw) => {
                        const parsed = Number.parseInt(raw.trim(), 10);
                        if (!Number.isFinite(parsed) || parsed < 0) {
                          return { ok: false, error: "Geçerli stok girin" };
                        }
                        return { ok: true, value: String(parsed) };
                      }}
                      onCommit={(value) =>
                        saveSimpleVariant(product, {
                          stockQuantity: Number.parseInt(value, 10),
                        })
                      }
                    />
                  )}
                  {hasVariants ? (
                    <span className="pt-1.5 text-xs text-slate-400" title="Varyant satırından işaretleyin">
                      —
                    </span>
                  ) : (
                    <FeedSyncLockCheckbox
                      checked={feedLockOverrides[product.id] ?? product.feedSyncLocked}
                      disabled={!canQuickEdit || isPending}
                      label={`${product.title} XML/API koruması`}
                      onChange={(next) => toggleFeedLock(product, next)}
                    />
                  )}
                  <span className="flex items-center gap-1 pt-1.5">
                    {product.isActive ? (
                      <span
                        className="inline-flex text-[#0ab39c]"
                        title={product.availableForOrder ? "Çevrimiçi" : "Çevrimiçi · satış kapalı"}
                      >
                        <Check className="h-4 w-4" strokeWidth={2.5} />
                        <span className="sr-only">Çevrimiçi</span>
                      </span>
                    ) : (
                      <span className="inline-flex text-rose-600" title="Pasif">
                        <X className="h-4 w-4" strokeWidth={2.5} />
                        <span className="sr-only">Pasif</span>
                      </span>
                    )}
                  </span>
                  <div className="flex items-center justify-end gap-1 pt-0.5">
                    <Can resource="products" action="update">
                      <Link
                        href={`/admin/products/${product.id}/edit`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#e9ebec] text-slate-500 hover:bg-slate-50 hover:text-[#405189]"
                        title="Düzenle"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Link>
                    </Can>
                    {canCreate ? (
                      <button
                        type="button"
                        onClick={() => duplicateProduct(product)}
                        disabled={isPending}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#e9ebec] text-slate-500 hover:bg-slate-50 hover:text-[#405189] disabled:opacity-60"
                        title="Kopyala"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                    {canUpdate ? (
                      <button
                        type="button"
                        onClick={() => toggleActive(product)}
                        disabled={isPending}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#e9ebec] text-slate-500 hover:bg-slate-50 hover:text-[#0ab39c] disabled:opacity-60"
                        title={product.isActive ? "Taslağa al" : "Yayınla"}
                      >
                        <Power className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                    {canDelete ? (
                      <button
                        type="button"
                        onClick={() => {
                          setActionError(null);
                          setDeleteTarget(product);
                        }}
                        disabled={isPending}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#e9ebec] text-slate-500 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-60"
                        title="Sil"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </div>
                  {hasVariants ? (
                    <button
                      type="button"
                      aria-expanded={expanded}
                      aria-label={expanded ? "Varyantları gizle" : "Varyantları göster"}
                      onClick={() => toggleExpanded(product.id)}
                      className={`inline-flex h-8 w-8 items-center justify-center justify-self-end rounded-md border text-slate-500 transition hover:bg-slate-50 hover:text-[#405189] ${
                        expanded
                          ? "border-[#0ab39c] bg-[#0ab39c]/10 text-[#0ab39c]"
                          : "border-[#e9ebec]"
                      }`}
                      title={expanded ? "Varyantları gizle" : "Varyantları göster"}
                    >
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
                      />
                    </button>
                  ) : (
                    <span />
                  )}
                </div>
                {hasVariants && expanded ? (
                  <ProductListVariantsPanel
                    productId={product.id}
                    productImage={product.image}
                    canUpdate={canUpdate}
                    lockStock={advancedInventory}
                    onStockChange={(nextStock) =>
                      setStockOverrides((prev) => ({ ...prev, [product.id]: nextStock }))
                    }
                    onSaleChange={applySaleResult}
                  />
                ) : null}
                </div>
                );
              })}
            </div>
          </div>
        )}

        {pageCount > 1 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e9ebec] px-4 py-3">
            <p className="text-xs text-slate-500">
              Sayfa {page} / {pageCount}
            </p>
            <div className="flex gap-2">
              {page <= 1 ? (
                <span className="inline-flex items-center gap-1 rounded-md border border-[#e9ebec] px-3 py-1.5 text-sm text-slate-400">
                  <ChevronLeft className="h-4 w-4" />
                  Önceki
                </span>
              ) : (
                <Link
                  href={adminProductCatalogHref(query, page - 1)}
                  className="inline-flex items-center gap-1 rounded-md border border-[#e9ebec] px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Önceki
                </Link>
              )}
              {page >= pageCount ? (
                <span className="inline-flex items-center gap-1 rounded-md border border-[#e9ebec] px-3 py-1.5 text-sm text-slate-400">
                  Sonraki
                  <ChevronRight className="h-4 w-4" />
                </span>
              ) : (
                <Link
                  href={adminProductCatalogHref(query, page + 1)}
                  className="inline-flex items-center gap-1 rounded-md border border-[#e9ebec] px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Sonraki
                  <ChevronRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {deleteTarget ? (
        <DeleteProductModal
          product={deleteTarget}
          isPending={isPending}
          error={actionError}
          onClose={() => {
            if (isPending) return;
            setDeleteTarget(null);
            setActionError(null);
          }}
          onConfirm={confirmDelete}
        />
      ) : null}
      {saleTarget ? (
        <ProductSaleModal
          target={saleTarget}
          onClose={() => setSaleTarget(null)}
          onSaved={applySaleResult}
        />
      ) : null}
    </>
  );
}
