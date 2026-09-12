"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronDown,
  ChevronRight,
  FolderPlus,
  Loader2,
  Package,
  Pencil,
  Power,
  Trash2,
  X,
} from "lucide-react";
import { Can } from "@/components/admin/admin-permissions";
import {
  adminProductCatalogHref,
  emptyAdminProductListQuery,
} from "@/lib/admin-product-list";
import {
  buildCategoryTree,
  flattenCategoryTree,
  type CategoryTreeNode,
} from "@/lib/category-tree";
import { stripHtml } from "@/lib/html";
import {
  deleteProductCategoryAction,
  toggleProductCategoryActiveAction,
} from "./actions";

export type ProductCategoryRow = {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  isActive: boolean;
  sortOrder: number;
  _count: { children: number };
  productCount: { total: number; active: number; inactive: number };
};

function categoryProductsHref(categoryId: string) {
  return adminProductCatalogHref({
    ...emptyAdminProductListQuery(),
    categoryId,
  });
}

type TreeRow = CategoryTreeNode<ProductCategoryRow>;

function CategoryTreeRows({
  nodes,
  collapsed,
  toggleCollapsed,
  onRequestDelete,
  onToggleActive,
}: {
  nodes: TreeRow[];
  collapsed: Set<string>;
  toggleCollapsed: (id: string) => void;
  onRequestDelete: (category: ProductCategoryRow) => void;
  onToggleActive: (category: ProductCategoryRow) => void;
}) {
  return (
    <>
      {nodes.map((category) => {
        const hasChildren = category.children.length > 0;
        const isCollapsed = collapsed.has(category.id);

        return (
          <div key={category.id}>
            <div
              className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,0.8fr)_70px_60px_90px_170px] items-center gap-2 border-b border-[#e9ebec] px-4 py-3 text-sm last:border-0"
              style={{ paddingLeft: `${16 + category.depth * 22}px` }}
            >
              <div className="flex min-w-0 items-center gap-2">
                {hasChildren ? (
                  <button
                    type="button"
                    onClick={() => toggleCollapsed(category.id)}
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[#e9ebec] text-slate-500 hover:bg-slate-50"
                    aria-label={isCollapsed ? "Alt kategorileri aç" : "Alt kategorileri kapat"}
                  >
                    {isCollapsed ? (
                      <ChevronRight className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                ) : (
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center text-slate-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                  </span>
                )}

                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-[#f3f6f9]">
                  {category.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={category.image} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-[10px] font-semibold text-[#405189]">
                      {category.name.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium text-slate-800">{category.name}</p>
                    {category.depth > 0 ? (
                      <span className="rounded bg-[#405189]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#405189]">
                        Alt · Seviye {category.depth}
                      </span>
                    ) : (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                        Ana
                      </span>
                    )}
                  </div>
                  {category.description ? (
                    <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">
                      {stripHtml(category.description)}
                    </p>
                  ) : null}
                </div>

                <Link
                  href={categoryProductsHref(category.id)}
                  title={`${category.productCount.total} ürün · Aktif ${category.productCount.active} · Pasif ${category.productCount.inactive}`}
                  className="group/count inline-flex shrink-0 items-center gap-1.5 rounded-md border border-[#405189]/20 bg-[#405189]/5 px-2 py-1 text-[11px] font-semibold text-[#405189] transition hover:border-[#405189]/40 hover:bg-[#405189]/10"
                >
                  <Package className="h-3.5 w-3.5" />
                  <span>{category.productCount.total}</span>
                  <span className="hidden whitespace-nowrap font-medium text-slate-500 group-hover/count:inline">
                    <span className="text-emerald-600">
                      {category.productCount.active} aktif
                    </span>
                    <span className="mx-1 text-slate-300">·</span>
                    <span className="text-rose-600">
                      {category.productCount.inactive} pasif
                    </span>
                  </span>
                </Link>
              </div>

              <div>
                <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-600">
                  {category.slug}
                </span>
              </div>

              <div className="text-slate-600">
                {category._count.children > 0 ? (
                  <span className="text-xs text-slate-500">{category._count.children} alt</span>
                ) : (
                  <span className="text-xs text-slate-400">—</span>
                )}
              </div>

              <div className="text-slate-600">{category.sortOrder}</div>

              <div>
                {category.isActive ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-600">
                    <Check className="h-3.5 w-3.5" />
                    Aktif
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-600">
                    <X className="h-3.5 w-3.5" />
                    Pasif
                  </span>
                )}
              </div>

              <div className="flex items-center justify-end gap-1.5">
                <Can resource="product_categories" action="create">
                  <Link
                    href={`/admin/products/categories/new?parentId=${category.id}`}
                    title="Alt kategori ekle"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#0ab39c]/30 text-[#0ab39c] transition hover:bg-[#0ab39c]/10"
                  >
                    <FolderPlus className="h-4 w-4" />
                  </Link>
                </Can>
                <Can resource="product_categories" action="update">
                  <button
                    type="button"
                    title={category.isActive ? "Pasife al" : "Aktif et"}
                    onClick={() => onToggleActive(category)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#e9ebec] text-slate-500 transition hover:bg-slate-50 hover:text-[#0ab39c]"
                  >
                    <Power className="h-4 w-4" />
                  </button>
                </Can>
                <Can resource="product_categories" action="update">
                  <Link
                    href={`/admin/products/categories/${category.id}/edit`}
                    title="Düzenle"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#e9ebec] text-slate-500 transition hover:bg-slate-50 hover:text-[#405189]"
                  >
                    <Pencil className="h-4 w-4" />
                  </Link>
                </Can>
                <Can resource="product_categories" action="delete">
                  <button
                    type="button"
                    title="Sil"
                    onClick={() => onRequestDelete(category)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-rose-200 text-rose-500 transition hover:bg-rose-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </Can>
              </div>
            </div>

            {hasChildren && !isCollapsed ? (
              <CategoryTreeRows
                nodes={category.children}
                collapsed={collapsed}
                toggleCollapsed={toggleCollapsed}
                onRequestDelete={onRequestDelete}
                onToggleActive={onToggleActive}
              />
            ) : null}
          </div>
        );
      })}
    </>
  );
}

export function ProductCategoriesTable({
  categories,
}: {
  categories: ProductCategoryRow[];
}) {
  const router = useRouter();
  const tree = useMemo(() => buildCategoryTree(categories), [categories]);
  const flatCount = useMemo(() => flattenCategoryTree(tree).length, [tree]);
  const [collapsed, setCollapsed] = useState<Set<string>>(
    () =>
      new Set(
        categories.filter((category) => category._count.children > 0).map((category) => category.id),
      ),
  );
  const [deleteTarget, setDeleteTarget] = useState<ProductCategoryRow | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const toggleCollapsed = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => setCollapsed(new Set());
  const collapseAll = () => {
    const parents = categories.filter((c) => c._count.children > 0).map((c) => c.id);
    setCollapsed(new Set(parents));
  };

  const closeDeleteModal = () => {
    if (isPending) return;
    setDeleteTarget(null);
    setActionError(null);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    startTransition(async () => {
      const result = await deleteProductCategoryAction({ id: deleteTarget.id });
      if (result.blocked || result.error) {
        setActionError(result.error ?? "Silinemedi.");
        return;
      }
      setDeleteTarget(null);
      setActionError(null);
      router.refresh();
    });
  };

  const toggleActive = (category: ProductCategoryRow) => {
    startTransition(async () => {
      await toggleProductCategoryActiveAction(category.id);
      router.refresh();
    });
  };

  if (categories.length === 0) {
    return (
      <div className="rounded-lg border border-[#e9ebec] bg-white px-5 py-12 text-center shadow-sm">
        <p className="text-sm text-slate-500">Henüz ürün kategorisi eklenmedi.</p>
        <Can resource="product_categories" action="create">
          <Link
            href="/admin/products/categories/new"
            className="mt-4 inline-flex rounded-md bg-[#0ab39c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#099885]"
          >
            İlk Kategoriyi Ekle
          </Link>
        </Can>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-[#e9ebec] bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e9ebec] bg-[#f3f6f9] px-4 py-3">
          <p className="text-xs font-medium text-slate-500">
            {flatCount} kategori · sınırsız alt kategori desteklenir
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={expandAll}
              className="rounded-md border border-[#e9ebec] bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Tümünü Aç
            </button>
            <button
              type="button"
              onClick={collapseAll}
              className="rounded-md border border-[#e9ebec] bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Tümünü Kapat
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,0.8fr)_70px_60px_90px_170px] gap-2 border-b border-[#e9ebec] px-4 py-3 text-xs font-semibold tracking-wide text-slate-500 uppercase">
              <div>Kategori</div>
              <div>Slug</div>
              <div>Alt</div>
              <div>Sıra</div>
              <div>Durum</div>
              <div className="text-right">İşlemler</div>
            </div>
            <CategoryTreeRows
              nodes={tree}
              collapsed={collapsed}
              toggleCollapsed={toggleCollapsed}
              onRequestDelete={(category) => {
                setActionError(null);
                setDeleteTarget(category);
              }}
              onToggleActive={toggleActive}
            />
          </div>
        </div>
      </div>

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Kapat"
            className="absolute inset-0 bg-slate-900/50"
            disabled={isPending}
            onClick={closeDeleteModal}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-md rounded-xl border border-[#e9ebec] bg-white p-5 shadow-xl"
          >
            <h2 className="text-base font-semibold text-slate-800">Kategoriyi sil</h2>
            {deleteTarget._count.children > 0 ? (
              <p className="mt-2 text-sm text-slate-600">
                “{deleteTarget.name}” kategorisinin {deleteTarget._count.children} alt
                kategorisi var. Silmeden önce alt kategorileri taşıyın veya silin.
              </p>
            ) : (
              <p className="mt-2 text-sm text-slate-600">
                “{deleteTarget.name}” kategorisi kalıcı olarak silinecek.
              </p>
            )}
            {actionError ? (
              <p className="mt-3 text-sm text-rose-600">{actionError}</p>
            ) : null}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={isPending}
                onClick={closeDeleteModal}
                className="rounded-md border border-[#e9ebec] px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Vazgeç
              </button>
              {deleteTarget._count.children === 0 ? (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={confirmDelete}
                  className="inline-flex items-center gap-2 rounded-md bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-70"
                >
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Sil
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
