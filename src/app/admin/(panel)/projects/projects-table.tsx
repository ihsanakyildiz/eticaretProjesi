"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Check,
  Loader2,
  Pencil,
  Power,
  RotateCcw,
  Search,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { SearchableSelect } from "@/components/admin/searchable-select";
import { AdminPublicLink, AdminPublicTextLink } from "@/components/admin/admin-public-link";
import { stripHtml } from "@/lib/html";
import { publicProjectCategoryHref, publicProjectHref } from "@/lib/public-urls";
import {
  deleteProjectAction,
  toggleProjectActiveAction,
  toggleProjectFeaturedAction,
} from "./actions";

export type ProjectRow = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  image: string | null;
  isActive: boolean;
  isFeatured: boolean;
  projectYear: number | null;
  projectUrl: string | null;
  sortOrder: number;
  categoryId: string | null;
  clientId: string | null;
  statusNote: string | null;
  category: { id: string; name: string; slug: string } | null;
  client: { id: string; name: string; slug: string; sector: string | null } | null;
  features: { id: string; name: string; slug: string }[];
};

export type ProjectCategoryFilterOption = {
  id: string;
  label: string;
  depth: number;
};

export type ProjectFeatureFilterOption = {
  id: string;
  label: string;
};

type StatusFilter = "all" | "active" | "passive";
type FeaturedFilter = "all" | "featured" | "regular";

const UNCATEGORIZED_ID = "__uncategorized__";

function normalizeSearch(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function DeleteProjectModal({
  project,
  isPending,
  error,
  onClose,
  onConfirm,
}: {
  project: ProjectRow;
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
        aria-labelledby="delete-project-title"
        className="relative w-full max-w-md overflow-hidden rounded-xl border border-[#e9ebec] bg-white shadow-xl"
      >
        <div className="flex items-start gap-3 border-b border-[#e9ebec] px-5 py-4">
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="delete-project-title" className="text-base font-semibold text-slate-800">
              Projeyi sil
            </h2>
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
            <strong className="font-semibold text-slate-800">{project.title}</strong> projesini silmek
            istediğinize emin misiniz?
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-500">
            <li>Proje kalıcı olarak silinecek.</li>
            {project.image ? <li>Kapak görseli sunucudan kaldırılacak.</li> : null}
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

export function ProjectsTable({
  projects,
  categoryOptions,
  featureOptions = [],
  initialCategoryId,
}: {
  projects: ProjectRow[];
  categoryOptions: ProjectCategoryFilterOption[];
  featureOptions?: ProjectFeatureFilterOption[];
  initialCategoryId?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState(initialCategoryId ?? "");
  const [featureId, setFeatureId] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [featured, setFeatured] = useState<FeaturedFilter>("all");
  const [deleteTarget, setDeleteTarget] = useState<ProjectRow | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setCategoryId(initialCategoryId ?? "");
  }, [initialCategoryId]);

  const selectOptions = useMemo(
    () => [
      ...categoryOptions,
      { id: UNCATEGORIZED_ID, label: "Kategorisiz", depth: 0 },
    ],
    [categoryOptions],
  );

  const filtered = useMemo(() => {
    const needle = normalizeSearch(query);

    return projects.filter((project) => {
      if (categoryId === UNCATEGORIZED_ID) {
        if (project.categoryId) return false;
      } else if (categoryId && project.categoryId !== categoryId) {
        return false;
      }

      if (featureId && !project.features.some((feature) => feature.id === featureId)) {
        return false;
      }

      if (status === "active" && !project.isActive) return false;
      if (status === "passive" && project.isActive) return false;
      if (featured === "featured" && !project.isFeatured) return false;
      if (featured === "regular" && project.isFeatured) return false;

      if (!needle) return true;

      const haystack = normalizeSearch(
        [
          project.title,
          project.slug,
          stripHtml(project.summary),
          project.category?.name ?? "",
          project.statusNote ?? "",
          project.client?.name ?? "",
          project.client?.sector ?? "",
          project.projectUrl ?? "",
          project.projectYear ? String(project.projectYear) : "",
          ...project.features.map((feature) => feature.name),
        ].join(" "),
      );
      return haystack.includes(needle);
    });
  }, [projects, categoryId, featureId, status, featured, query]);

  const hasActiveFilters =
    Boolean(query.trim()) ||
    Boolean(categoryId) ||
    Boolean(featureId) ||
    status !== "all" ||
    featured !== "all";

  const resetFilters = () => {
    setQuery("");
    setCategoryId("");
    setFeatureId("");
    setStatus("all");
    setFeatured("all");
    router.replace("/admin/projects");
  };

  const onCategoryChange = (value: string) => {
    setCategoryId(value);
    if (!value || value === UNCATEGORIZED_ID) {
      router.replace("/admin/projects");
      return;
    }
    router.replace(`/admin/projects?categoryId=${value}`);
  };

  const closeDeleteModal = () => {
    if (isPending) return;
    setDeleteTarget(null);
    setDeleteError(null);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;

    const formData = new FormData();
    formData.set("id", deleteTarget.id);

    startTransition(async () => {
      const result = await deleteProjectAction(formData);
      if (result.error) {
        setDeleteError(result.error);
        return;
      }
      setDeleteTarget(null);
      setDeleteError(null);
      router.refresh();
    });
  };

  if (projects.length === 0) {
    return (
      <div className="rounded-lg border border-[#e9ebec] bg-white px-5 py-12 text-center shadow-sm">
        <p className="text-sm text-slate-500">Henüz yayınlanmış bir proje yok.</p>
        <Link
          href="/admin/projects/new"
          className="mt-4 inline-flex rounded-md bg-[#0ab39c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#099885]"
        >
          İlk Projeyi Ekle
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border border-[#e9ebec] bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.7fr)_minmax(0,0.7fr)_auto]">
          <div>
            <label htmlFor="projects-search" className="mb-1.5 block text-xs font-medium text-slate-500">
              Arama
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="projects-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Başlık, müşteri, özellik ara…"
                className="w-full rounded-md border border-[#e9ebec] bg-white py-2.5 pr-3 pl-9 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#0ab39c] focus:ring-2 focus:ring-[#0ab39c]/20"
              />
            </div>
          </div>

          <div>
            <label htmlFor="projects-category" className="mb-1.5 block text-xs font-medium text-slate-500">
              Kategori
            </label>
            <SearchableSelect
              id="projects-category"
              name="filterCategoryId"
              value={categoryId}
              onChange={onCategoryChange}
              options={selectOptions}
              placeholder="Kategori ara veya seçin…"
              emptyLabel="— Tüm kategoriler —"
              searchPlaceholder="Kategori ara…"
              noResultsLabel="Eşleşen kategori yok"
            />
          </div>

          <div>
            <label htmlFor="projects-feature" className="mb-1.5 block text-xs font-medium text-slate-500">
              Özellik
            </label>
            <SearchableSelect
              id="projects-feature"
              name="filterFeatureId"
              value={featureId}
              onChange={setFeatureId}
              options={featureOptions.map((feature) => ({
                id: feature.id,
                label: feature.label,
                depth: 0,
              }))}
              placeholder="Özellik ara veya seçin…"
              emptyLabel="— Tüm özellikler —"
              searchPlaceholder="PHP, React…"
              noResultsLabel="Eşleşen özellik yok"
            />
          </div>

          <div>
            <label htmlFor="projects-status" className="mb-1.5 block text-xs font-medium text-slate-500">
              Durum
            </label>
            <select
              id="projects-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as StatusFilter)}
              className="w-full rounded-md border border-[#e9ebec] bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-[#0ab39c] focus:ring-2 focus:ring-[#0ab39c]/20"
            >
              <option value="all">Tümü</option>
              <option value="active">Aktif</option>
              <option value="passive">Pasif</option>
            </select>
          </div>

          <div>
            <label htmlFor="projects-featured" className="mb-1.5 block text-xs font-medium text-slate-500">
              Vitrin
            </label>
            <select
              id="projects-featured"
              value={featured}
              onChange={(e) => setFeatured(e.target.value as FeaturedFilter)}
              className="w-full rounded-md border border-[#e9ebec] bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-[#0ab39c] focus:ring-2 focus:ring-[#0ab39c]/20"
            >
              <option value="all">Tümü</option>
              <option value="featured">Öne çıkan</option>
              <option value="regular">Normal</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={resetFilters}
              disabled={!hasActiveFilters}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-[#e9ebec] px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <RotateCcw className="h-4 w-4" />
              Sıfırla
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-[#e9ebec] bg-white shadow-sm">
        <div className="border-b border-[#e9ebec] bg-[#f3f6f9] px-4 py-3">
          <p className="text-xs font-medium text-slate-500">
            {filtered.length} / {projects.length} proje listeleniyor
          </p>
        </div>

        {filtered.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-slate-500">
            Filtrelere uygun proje bulunamadı.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[980px]">
              <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,0.9fr)_minmax(0,1.1fr)_60px_90px_210px] gap-2 border-b border-[#e9ebec] px-4 py-3 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                <div>Proje</div>
                <div>Kategori</div>
                <div>Özellikler</div>
                <div>Sıra</div>
                <div>Durum</div>
                <div className="text-right">İşlemler</div>
              </div>

              {filtered.map((project) => (
                <div
                  key={project.id}
                  className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,0.9fr)_minmax(0,1.1fr)_60px_90px_210px] items-center gap-2 border-b border-[#e9ebec] px-4 py-3 text-sm last:border-0"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-[#f3f6f9]">
                      {project.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={project.image} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-[10px] font-semibold text-[#405189]">
                          {project.title.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        {project.isFeatured ? (
                          <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />
                        ) : null}
                        <p className="truncate font-medium text-slate-800">
                          <AdminPublicTextLink href={publicProjectHref(project.slug)}>
                            {project.title}
                          </AdminPublicTextLink>
                        </p>
                      </div>
                      {project.client?.name ? (
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {project.client.name}
                          {project.projectYear ? ` · ${project.projectYear}` : ""}
                        </p>
                      ) : project.projectYear ? (
                        <p className="mt-0.5 text-xs text-slate-500">{project.projectYear}</p>
                      ) : null}
                      {project.summary ? (
                        <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">
                          {stripHtml(project.summary)}
                        </p>
                      ) : null}
                      {!project.isActive && project.statusNote ? (
                        <p className="mt-1 text-[11px] font-medium text-amber-700">
                          {project.statusNote}
                        </p>
                      ) : null}
                      <AdminPublicTextLink
                        href={publicProjectHref(project.slug)}
                        className="mt-1 inline-block rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500"
                      >
                        {publicProjectHref(project.slug)}
                      </AdminPublicTextLink>
                    </div>
                  </div>

                  <div>
                    {project.category?.slug ? (
                      <AdminPublicTextLink
                        href={publicProjectCategoryHref(project.category.slug)}
                        className="inline-flex rounded-md bg-[#405189]/10 px-2 py-1 text-xs font-medium text-[#405189]"
                      >
                        {project.category.name}
                      </AdminPublicTextLink>
                    ) : project.category ? (
                      <span className="inline-flex rounded-md bg-[#405189]/10 px-2 py-1 text-xs font-medium text-[#405189]">
                        {project.category.name}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">Kategorisiz</span>
                    )}
                  </div>

                  <div className="min-w-0">
                    {project.features.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {project.features.slice(0, 4).map((feature) => (
                          <span
                            key={feature.id}
                            className="inline-flex rounded-md bg-[#0ab39c]/10 px-2 py-0.5 text-[11px] font-medium text-[#0ab39c]"
                          >
                            {feature.name}
                          </span>
                        ))}
                        {project.features.length > 4 ? (
                          <span className="text-[11px] text-slate-400">
                            +{project.features.length - 4}
                          </span>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </div>

                  <div className="text-slate-600">{project.sortOrder}</div>

                  <div>
                    {project.isActive ? (
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
                    <AdminPublicLink href={publicProjectHref(project.slug)} />
                    <form action={toggleProjectFeaturedAction}>
                      <input type="hidden" name="id" value={project.id} />
                      <button
                        type="submit"
                        title={project.isFeatured ? "Vitrinden çıkar" : "Vitrine ekle"}
                        className={`inline-flex h-8 w-8 items-center justify-center rounded-md border transition ${
                          project.isFeatured
                            ? "border-amber-200 bg-amber-50 text-amber-500"
                            : "border-[#e9ebec] text-slate-500 hover:bg-slate-50 hover:text-amber-500"
                        }`}
                      >
                        <Star className={`h-4 w-4 ${project.isFeatured ? "fill-current" : ""}`} />
                      </button>
                    </form>
                    <form action={toggleProjectActiveAction}>
                      <input type="hidden" name="id" value={project.id} />
                      <button
                        type="submit"
                        title={project.isActive ? "Pasife al" : "Aktif et"}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#e9ebec] text-slate-500 transition hover:bg-slate-50 hover:text-[#0ab39c]"
                      >
                        <Power className="h-4 w-4" />
                      </button>
                    </form>
                    <Link
                      href={`/admin/projects/${project.id}/edit`}
                      title="Düzenle"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#e9ebec] text-slate-500 transition hover:bg-slate-50 hover:text-[#405189]"
                    >
                      <Pencil className="h-4 w-4" />
                    </Link>
                    <button
                      type="button"
                      title="Sil"
                      onClick={() => {
                        setDeleteError(null);
                        setDeleteTarget(project);
                      }}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-rose-200 text-rose-500 transition hover:bg-rose-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {deleteTarget ? (
        <DeleteProjectModal
          project={deleteTarget}
          isPending={isPending}
          error={deleteError}
          onClose={closeDeleteModal}
          onConfirm={confirmDelete}
        />
      ) : null}
    </>
  );
}
