"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronDown,
  ChevronRight,
  FolderPlus,
  Pencil,
  Power,
  Trash2,
  X,
} from "lucide-react";
import { AdminPublicLink, AdminPublicTextLink } from "@/components/admin/admin-public-link";
import {
  buildCategoryTree,
  flattenCategoryTree,
  type CategoryTreeNode,
} from "@/lib/category-tree";
import { stripHtml } from "@/lib/html";
import { publicWorkCategoryHref } from "@/lib/public-urls";
import {
  activateWorkCategoryAction,
  deactivateWorkCategoryAction,
  deleteWorkCategoryAction,
} from "./actions";
import {
  DeactivateCategoryModal,
  DeleteCategoryImpactModal,
  type CategoryMoveOption,
  type WorkCategoryRow,
} from "./category-impact-modals";

export type { WorkCategoryRow };

type TreeRow = CategoryTreeNode<WorkCategoryRow>;

type DeleteModalState =
  | { type: "confirm"; category: WorkCategoryRow }
  | { type: "blocked"; category: WorkCategoryRow }
  | null;

function CategoryTreeRows({
  nodes,
  collapsed,
  toggleCollapsed,
  onRequestDelete,
  onRequestDeactivate,
  onRequestActivate,
}: {
  nodes: TreeRow[];
  collapsed: Set<string>;
  toggleCollapsed: (id: string) => void;
  onRequestDelete: (category: WorkCategoryRow) => void;
  onRequestDeactivate: (category: WorkCategoryRow) => void;
  onRequestActivate: (category: WorkCategoryRow) => void;
}) {
  return (
    <>
      {nodes.map((category) => {
        const hasChildren = category.children.length > 0;
        const isCollapsed = collapsed.has(category.id);

        return (
          <div key={category.id}>
            <div
              className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,0.8fr)_70px_60px_90px_210px] items-center gap-2 border-b border-[#e9ebec] px-4 py-3 text-sm last:border-0"
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
                    <p className="truncate font-medium text-slate-800">
                      <AdminPublicTextLink href={publicWorkCategoryHref(category.slug)}>
                        {category.name}
                      </AdminPublicTextLink>
                    </p>
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
              </div>

              <div>
                <AdminPublicTextLink
                  href={publicWorkCategoryHref(category.slug)}
                  className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-600"
                >
                  {publicWorkCategoryHref(category.slug)}
                </AdminPublicTextLink>
              </div>

              <div className="text-slate-600">
                {category._count.works}
                {category._count.children > 0 ? (
                  <span className="ml-1 text-xs text-slate-400">
                    / {category._count.children} alt
                  </span>
                ) : null}
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
                <AdminPublicLink href={publicWorkCategoryHref(category.slug)} />
                <Link
                  href={`/admin/works/categories/new?parentId=${category.id}`}
                  title="Alt kategori ekle"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#0ab39c]/30 text-[#0ab39c] transition hover:bg-[#0ab39c]/10"
                >
                  <FolderPlus className="h-4 w-4" />
                </Link>
                <button
                  type="button"
                  title={category.isActive ? "Pasife al" : "Aktif et"}
                  onClick={() =>
                    category.isActive
                      ? onRequestDeactivate(category)
                      : onRequestActivate(category)
                  }
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#e9ebec] text-slate-500 transition hover:bg-slate-50 hover:text-[#0ab39c]"
                >
                  <Power className="h-4 w-4" />
                </button>
                <Link
                  href={`/admin/works/categories/${category.id}/edit`}
                  title="Düzenle"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#e9ebec] text-slate-500 transition hover:bg-slate-50 hover:text-[#405189]"
                >
                  <Pencil className="h-4 w-4" />
                </Link>
                <button
                  type="button"
                  title="Sil"
                  onClick={() => onRequestDelete(category)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-rose-200 text-rose-500 transition hover:bg-rose-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {hasChildren && !isCollapsed ? (
              <CategoryTreeRows
                nodes={category.children}
                collapsed={collapsed}
                toggleCollapsed={toggleCollapsed}
                onRequestDelete={onRequestDelete}
                onRequestDeactivate={onRequestDeactivate}
                onRequestActivate={onRequestActivate}
              />
            ) : null}
          </div>
        );
      })}
    </>
  );
}

export function WorkCategoriesTable({
  categories,
  categoryOptions,
}: {
  categories: WorkCategoryRow[];
  categoryOptions: CategoryMoveOption[];
}) {
  const router = useRouter();
  const tree = useMemo(() => buildCategoryTree(categories), [categories]);
  const flatCount = useMemo(() => flattenCategoryTree(tree).length, [tree]);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [deleteModal, setDeleteModal] = useState<DeleteModalState>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<WorkCategoryRow | null>(null);
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

  const requestDelete = (category: WorkCategoryRow) => {
    setActionError(null);
    if (category._count.children > 0) {
      setDeleteModal({ type: "blocked", category });
      return;
    }
    setDeleteModal({ type: "confirm", category });
  };

  const closeDeleteModal = () => {
    if (isPending) return;
    setDeleteModal(null);
    setActionError(null);
  };

  const closeDeactivateModal = () => {
    if (isPending) return;
    setDeactivateTarget(null);
    setActionError(null);
  };

  const confirmDelete = (worksMode?: "delete" | "deactivate") => {
    if (!deleteModal || deleteModal.type !== "confirm") return;
    if (deleteModal.category._count.works > 0 && !worksMode) {
      setActionError("Lütfen bağlı çalışmalar için bir seçenek belirleyin.");
      return;
    }

    startTransition(async () => {
      const result = await deleteWorkCategoryAction({
        id: deleteModal.category.id,
        worksMode,
      });
      if (result.blocked) {
        setDeleteModal({ type: "blocked", category: deleteModal.category });
        setActionError(result.error ?? null);
        return;
      }
      if (result.error) {
        setActionError(result.error);
        return;
      }
      setDeleteModal(null);
      setActionError(null);
      router.refresh();
    });
  };

  const confirmDeactivate = (moves: Record<string, string>) => {
    if (!deactivateTarget) return;
    startTransition(async () => {
      const result = await deactivateWorkCategoryAction({
        id: deactivateTarget.id,
        moves,
      });
      if (result.error) {
        setActionError(result.error);
        return;
      }
      setDeactivateTarget(null);
      setActionError(null);
      router.refresh();
    });
  };

  const requestActivate = (category: WorkCategoryRow) => {
    startTransition(async () => {
      await activateWorkCategoryAction(category.id);
      router.refresh();
    });
  };

  if (categories.length === 0) {
    return (
      <div className="rounded-lg border border-[#e9ebec] bg-white px-5 py-12 text-center shadow-sm">
        <p className="text-sm text-slate-500">Henüz hizmet kategorisi eklenmedi.</p>
        <Link
          href="/admin/works/categories/new"
          className="mt-4 inline-flex rounded-md bg-[#0ab39c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#099885]"
        >
          İlk Kategoriyi Ekle
        </Link>
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
            <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,0.8fr)_70px_60px_90px_210px] gap-2 border-b border-[#e9ebec] px-4 py-3 text-xs font-semibold tracking-wide text-slate-500 uppercase">
              <div>Kategori</div>
              <div>Slug</div>
              <div>İçerik</div>
              <div>Sıra</div>
              <div>Durum</div>
              <div className="text-right">İşlemler</div>
            </div>
            <CategoryTreeRows
              nodes={tree}
              collapsed={collapsed}
              toggleCollapsed={toggleCollapsed}
              onRequestDelete={requestDelete}
              onRequestDeactivate={(category) => {
                setActionError(null);
                setDeactivateTarget(category);
              }}
              onRequestActivate={requestActivate}
            />
          </div>
        </div>
      </div>

      {deleteModal ? (
        <DeleteCategoryImpactModal
          category={deleteModal.category}
          blocked={deleteModal.type === "blocked"}
          isPending={isPending}
          error={actionError}
          onClose={closeDeleteModal}
          onConfirm={confirmDelete}
        />
      ) : null}

      {deactivateTarget ? (
        <DeactivateCategoryModal
          category={deactivateTarget}
          categoryOptions={categoryOptions}
          isPending={isPending}
          error={actionError}
          onClose={closeDeactivateModal}
          onConfirm={confirmDeactivate}
        />
      ) : null}
    </>
  );
}
