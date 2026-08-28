"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { AlertTriangle, Loader2, Power, Trash2, X } from "lucide-react";
import {
  getCategoryProjectsAction,
  type CategoryProjectItem,
} from "./actions";

export type ProjectCategoryRow = {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  isActive: boolean;
  sortOrder: number;
  _count: { projects: number; children: number };
};

export type CategoryMoveOption = {
  id: string;
  label: string;
  depth: number;
};

function useEscapeClose(enabled: boolean, onClose: () => void) {
  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled, onClose]);
}

function ModalShell({
  title,
  subtitle,
  tone = "rose",
  isPending,
  onClose,
  children,
  footer,
  wide,
}: {
  title: string;
  subtitle: string;
  tone?: "rose" | "amber" | "teal";
  isPending: boolean;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
  wide?: boolean;
}) {
  useEscapeClose(!isPending, onClose);

  const toneClass =
    tone === "amber"
      ? "bg-amber-50 text-amber-600"
      : tone === "teal"
        ? "bg-[#0ab39c]/10 text-[#0ab39c]"
        : "bg-rose-50 text-rose-600";

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
        className={`relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-xl border border-[#e9ebec] bg-white shadow-xl ${
          wide ? "max-w-2xl" : "max-w-lg"
        }`}
      >
        <div className="flex items-start gap-3 border-b border-[#e9ebec] px-5 py-4">
          <span
            className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${toneClass}`}
          >
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-slate-800">{title}</h2>
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
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
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        <div className="flex flex-wrap justify-end gap-2 border-t border-[#e9ebec] bg-[#f3f6f9] px-5 py-3">
          {footer}
        </div>
      </div>
    </div>
  );
}

function ProjectsMoveList({
  projects,
  loading,
  moves,
  onMoveChange,
  categoryOptions,
  excludeCategoryId,
}: {
  projects: CategoryProjectItem[];
  loading: boolean;
  moves: Record<string, string>;
  onMoveChange: (projectId: string, categoryId: string) => void;
  categoryOptions: CategoryMoveOption[];
  excludeCategoryId: string;
}) {
  const targets = useMemo(
    () => categoryOptions.filter((option) => option.id !== excludeCategoryId),
    [categoryOptions, excludeCategoryId],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Projeler yükleniyor…
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <p className="rounded-lg border border-[#e9ebec] bg-[#f3f6f9] px-4 py-3 text-sm text-slate-500">
        Bu kategoride bağlı proje yok.
      </p>
    );
  }

  return (
    <div className="admin-scroll-light max-h-72 space-y-2 overflow-y-auto rounded-lg border border-[#e9ebec] bg-[#f3f6f9] p-2 pr-1">
      {projects.map((project) => (
        <div
          key={project.id}
          className="flex flex-col gap-2 rounded-lg border border-[#e9ebec] bg-white p-3 sm:flex-row sm:items-center"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-800">{project.title}</p>
            <p className="text-xs text-slate-400">{project.isActive ? "Aktif" : "Pasif"}</p>
          </div>
          <select
            value={moves[project.id] ?? ""}
            onChange={(e) => onMoveChange(project.id, e.target.value)}
            className="w-full rounded-md border border-[#e9ebec] bg-white px-2.5 py-2 text-sm text-slate-700 outline-none focus:border-[#0ab39c] sm:w-56"
          >
            <option value="">— Taşıma (pasife alınır) —</option>
            {targets.map((option) => (
              <option key={option.id} value={option.id}>
                {"— ".repeat(option.depth)}
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}

export function DeactivateCategoryModal({
  category,
  categoryOptions,
  isPending,
  error,
  onClose,
  onConfirm,
}: {
  category: ProjectCategoryRow;
  categoryOptions: CategoryMoveOption[];
  isPending: boolean;
  error?: string | null;
  onClose: () => void;
  onConfirm: (moves: Record<string, string>) => void;
}) {
  const [projects, setProjects] = useState<CategoryProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [moves, setMoves] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    void getCategoryProjectsAction(category.id).then((result) => {
      if (cancelled) return;
      if (result.error) setLoadError(result.error);
      setProjects(result.projects);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [category.id]);

  const remainingCount = projects.filter((project) => !moves[project.id]).length;

  return (
    <ModalShell
      title="Kategoriyi pasife al"
      subtitle="Bağlı projeler de etkilenecek."
      tone="teal"
      wide
      isPending={isPending}
      onClose={onClose}
      footer={
        <>
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
            onClick={() => onConfirm(moves)}
            disabled={isPending || loading}
            className="inline-flex items-center gap-2 rounded-md bg-[#405189] px-4 py-2 text-sm font-semibold text-white hover:bg-[#364574] disabled:opacity-70"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}
            Pasife Al
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong className="font-semibold">{category.name}</strong> pasife alındığında, taşınmayan
          projeler de otomatik olarak pasife alınır.
        </div>

        {category._count.projects > 0 ? (
          <>
            <p className="text-sm text-slate-600">
              Aşağıdaki projeleri başka bir kategoriye taşıyabilirsiniz. Taşımazsanız pasife
              alınırlar.
            </p>
            <ProjectsMoveList
              projects={projects}
              loading={loading}
              moves={moves}
              categoryOptions={categoryOptions}
              excludeCategoryId={category.id}
              onMoveChange={(projectId, categoryId) =>
                setMoves((prev) => {
                  const next = { ...prev };
                  if (!categoryId) delete next[projectId];
                  else next[projectId] = categoryId;
                  return next;
                })
              }
            />
            {!loading && projects.length > 0 ? (
              <p className="text-xs text-slate-500">
                {remainingCount} proje mevcut kategoride kalıp pasife alınacak.
              </p>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-slate-600">
            Bu kategoride proje yok. Yalnızca kategori pasife alınacak.
          </p>
        )}

        {loadError || error ? (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {loadError || error}
          </div>
        ) : null}
      </div>
    </ModalShell>
  );
}

export function DeleteCategoryImpactModal({
  category,
  blocked,
  isPending,
  error,
  onClose,
  onConfirm,
}: {
  category: ProjectCategoryRow;
  blocked: boolean;
  isPending: boolean;
  error?: string | null;
  onClose: () => void;
  onConfirm: (projectsMode?: "delete" | "deactivate") => void;
}) {
  const [projects, setProjects] = useState<CategoryProjectItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [projectsMode, setProjectsMode] = useState<"delete" | "deactivate" | null>(null);

  const hasProjects = category._count.projects > 0;

  useEffect(() => {
    if (blocked || !hasProjects) return;
    let cancelled = false;
    setLoading(true);
    void getCategoryProjectsAction(category.id).then((result) => {
      if (cancelled) return;
      setProjects(result.projects);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [blocked, hasProjects, category.id]);

  return (
    <ModalShell
      title={blocked ? "Silme işlemi engellendi" : "Kategoriyi sil"}
      subtitle={
        blocked
          ? "Önce alt kategorileri taşımanız gerekiyor."
          : hasProjects
            ? "Bu kategoriye bağlı projeler var."
            : "Bu işlem geri alınamaz."
      }
      tone={blocked ? "amber" : "rose"}
      wide={hasProjects && !blocked}
      isPending={isPending}
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-md border border-[#e9ebec] bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
          >
            {blocked ? "Tamam" : "Vazgeç"}
          </button>
          {!blocked ? (
            <button
              type="button"
              onClick={() => onConfirm(hasProjects ? projectsMode ?? undefined : undefined)}
              disabled={isPending || (hasProjects && !projectsMode)}
              className="inline-flex items-center gap-2 rounded-md bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-70"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Evet, Sil
            </button>
          ) : null}
        </>
      }
    >
      <div className="space-y-4">
        {blocked ? (
          <>
            <p className="text-sm leading-relaxed text-slate-600">
              <strong className="font-semibold text-slate-800">{category.name}</strong> kategorisinin{" "}
              <strong className="font-semibold text-slate-800">
                {category._count.children} alt kategorisi
              </strong>{" "}
              bulunduğu için silinemez.
            </p>
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Silmeden önce alt kategorileri düzenleyerek başka bir üst kategoriye taşıyın veya alt
              kategorileri tek tek silin.
            </div>
            <Link
              href={`/admin/projects/categories/${category.id}/edit`}
              className="inline-flex text-sm font-medium text-[#405189] hover:underline"
              onClick={onClose}
            >
              Bu kategoriyi düzenle →
            </Link>
          </>
        ) : hasProjects ? (
          <>
            <p className="text-sm text-slate-600">
              <strong className="font-semibold text-slate-800">{category.name}</strong> kategorisine
              bağlı <strong>{category._count.projects}</strong> proje var. Ne yapmak istersiniz?
            </p>

            <div className="space-y-2">
              <label
                className={`flex cursor-pointer gap-3 rounded-lg border p-3 transition ${
                  projectsMode === "delete"
                    ? "border-rose-300 bg-rose-50"
                    : "border-[#e9ebec] hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="projectsMode"
                  checked={projectsMode === "delete"}
                  onChange={() => setProjectsMode("delete")}
                  className="mt-1"
                />
                <span>
                  <span className="block text-sm font-semibold text-slate-800">
                    Evet, projeleri de sil
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    Bu kategoriye ekli tüm projeler kalıcı olarak silinir.
                  </span>
                </span>
              </label>

              <label
                className={`flex cursor-pointer gap-3 rounded-lg border p-3 transition ${
                  projectsMode === "deactivate"
                    ? "border-amber-300 bg-amber-50"
                    : "border-[#e9ebec] hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="projectsMode"
                  checked={projectsMode === "deactivate"}
                  onChange={() => setProjectsMode("deactivate")}
                  className="mt-1"
                />
                <span>
                  <span className="block text-sm font-semibold text-slate-800">
                    Hayır, projeleri silme
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    Projeler pasife alınır, kategorisiz bırakılır ve projelerde “Kategorisi
                    olmadığı için pasif edildi” bilgisi gösterilir.
                  </span>
                </span>
              </label>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                Bağlı projeler ({projects.length || category._count.projects})
              </p>
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Yükleniyor…
                </div>
              ) : (
                <ul className="admin-scroll-light max-h-60 space-y-1.5 overflow-y-auto rounded-lg border border-[#e9ebec] bg-[#f3f6f9] p-3 text-sm text-slate-700">
                  {projects.map((project) => (
                    <li key={project.id} className="truncate border-b border-[#e9ebec]/80 pb-1.5 last:border-0 last:pb-0">
                      • {project.title}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        ) : (
          <>
            <p className="text-sm leading-relaxed text-slate-600">
              <strong className="font-semibold text-slate-800">{category.name}</strong> kategorisini
              silmek istediğinize emin misiniz?
            </p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-500">
              <li>Kategori kalıcı olarak silinecek.</li>
              {category.image ? <li>Kapak görseli sunucudan kaldırılacak.</li> : null}
            </ul>
          </>
        )}

        {error ? (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        ) : null}
      </div>
    </ModalShell>
  );
}
