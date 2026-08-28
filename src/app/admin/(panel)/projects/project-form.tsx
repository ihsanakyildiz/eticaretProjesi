"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminSwitch } from "@/components/admin/admin-switch";
import {
  ChevronDown,
  ChevronUp,
  ImageIcon,
  Loader2,
  Plus,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { SearchableSelect } from "@/components/admin/searchable-select";
import { uploadAdminMedia } from "@/components/admin/upload-admin-media";
import {
  PROJECT_GALLERY_MAX,
  PROJECT_HIGHLIGHT_MAX,
  PROJECT_METRIC_MAX,
  PROJECT_ROLE_OPTIONS,
  parseProjectHighlights,
  type ProjectMetricInput,
} from "@/lib/project-portfolio";
import { resolveProjectSeo, SEO_DESCRIPTION_MAX, SEO_TITLE_MAX, clampSeoText } from "@/lib/seo";
import {
  createProjectAction,
  updateProjectAction,
  type ProjectFormState,
} from "./actions";

const initialState: ProjectFormState = {};

type GalleryItem = {
  key: string;
  id?: string;
  path?: string;
  preview: string;
  file?: File;
};

type ProjectFormValues = {
  id?: string;
  categoryId?: string | null;
  featureIds?: string[];
  title?: string;
  slug?: string;
  summary?: string;
  content?: string;
  image?: string;
  projectUrl?: string;
  hideProjectUrl?: boolean;
  clientId?: string | null;
  isFeatured?: boolean;
  projectYear?: number | null;
  projectRole?: string;
  projectDuration?: string;
  sortOrder?: number;
  isActive?: boolean;
  seoTitle?: string;
  seoDescription?: string;
  gallery?: { id: string; image: string; sortOrder: number }[];
  metrics?: ProjectMetricInput[];
  brochurePdf?: string | null;
  brochureZip?: string | null;
  highlights?: string | null;
  faqGroupId?: string | null;
};

type CategoryOption = {
  id: string;
  label: string;
  depth: number;
};

type FeatureOption = {
  id: string;
  label: string;
  isActive: boolean;
};

type ClientOption = {
  id: string;
  label: string;
  depth?: number;
};

type FaqGroupOption = {
  id: string;
  label: string;
  depth?: number;
};

type ProjectFormProps = {
  mode: "create" | "edit";
  initial?: ProjectFormValues;
  categoryOptions?: CategoryOption[];
  featureOptions?: FeatureOption[];
  clientOptions?: ClientOption[];
  faqGroupOptions?: FaqGroupOption[];
};

function slugPreview(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function newKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function ProjectForm({
  mode,
  initial,
  categoryOptions = [],
  featureOptions = [],
  clientOptions = [],
  faqGroupOptions = [],
}: ProjectFormProps) {
  const router = useRouter();
  const action = mode === "create" ? createProjectAction : updateProjectAction;
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(initial?.slug));
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  const [clientId, setClientId] = useState(initial?.clientId ?? "");
  const [faqGroupId, setFaqGroupId] = useState(initial?.faqGroupId ?? "");
  const [selectedFeatureIds, setSelectedFeatureIds] = useState<string[]>(
    () => initial?.featureIds ?? [],
  );
  const [featureQuery, setFeatureQuery] = useState("");
  const [summaryHtml, setSummaryHtml] = useState(initial?.summary ?? "");
  const [contentHtml, setContentHtml] = useState(initial?.content ?? "");
  const [seoTitle, setSeoTitle] = useState(() =>
    clampSeoText(initial?.seoTitle ?? "", SEO_TITLE_MAX),
  );
  const [seoDescription, setSeoDescription] = useState(() =>
    clampSeoText(initial?.seoDescription ?? "", SEO_DESCRIPTION_MAX),
  );
  const [image, setImage] = useState(initial?.image ?? "");
  const [preview, setPreview] = useState(initial?.image ?? "");
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverUploadError, setCoverUploadError] = useState<string | null>(null);
  const [brochurePdf, setBrochurePdf] = useState(initial?.brochurePdf ?? "");
  const [brochureZip, setBrochureZip] = useState(initial?.brochureZip ?? "");
  const [highlights, setHighlights] = useState<string[]>(() => {
    const parsed = parseProjectHighlights(initial?.highlights);
    return parsed.length > 0 ? parsed : [""];
  });
  const [gallery, setGallery] = useState<GalleryItem[]>(() =>
    (initial?.gallery ?? []).map((item) => ({
      key: item.id,
      id: item.id,
      path: item.image,
      preview: item.image,
    })),
  );
  const [metrics, setMetrics] = useState<ProjectMetricInput[]>(() =>
    (initial?.metrics ?? []).length > 0
      ? initial!.metrics!
      : [{ label: "", value: "" }],
  );
  const fileRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const brochurePdfRef = useRef<HTMLInputElement>(null);
  const brochureZipRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.success) {
      router.push("/admin/projects");
      router.refresh();
    }
  }, [state.success, router]);

  const autoSeo = useMemo(
    () =>
      resolveProjectSeo({
        title,
        summary: summaryHtml,
        content: contentHtml,
        seoTitle,
        seoDescription,
      }),
    [title, summaryHtml, contentHtml, seoTitle, seoDescription],
  );

  const filteredFeatures = useMemo(() => {
    const needle = featureQuery
      .toLocaleLowerCase("tr-TR")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
    if (!needle) return featureOptions;
    return featureOptions.filter((feature) =>
      feature.label
        .toLocaleLowerCase("tr-TR")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .includes(needle),
    );
  }, [featureOptions, featureQuery]);

  const galleryOrderJson = useMemo(() => {
    const order: Array<{ type: "existing"; id: string } | { type: "new"; index: number }> = [];
    let newIndex = 0;
    for (const item of gallery) {
      if (item.id) order.push({ type: "existing", id: item.id });
      else if (item.file) {
        order.push({ type: "new", index: newIndex });
        newIndex += 1;
      }
    }
    return JSON.stringify(order);
  }, [gallery]);

  const metricsJson = useMemo(
    () =>
      JSON.stringify(
        metrics
          .map((metric) => ({
            label: metric.label.trim(),
            value: metric.value.trim(),
          }))
          .filter((metric) => metric.label && metric.value)
          .slice(0, PROJECT_METRIC_MAX),
      ),
    [metrics],
  );

  const toggleFeature = (featureId: string) => {
    setSelectedFeatureIds((prev) =>
      prev.includes(featureId)
        ? prev.filter((id) => id !== featureId)
        : [...prev, featureId],
    );
  };

  const moveGalleryItem = (index: number, direction: -1 | 1) => {
    setGallery((prev) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= prev.length) return prev;
      const copy = [...prev];
      const [item] = copy.splice(index, 1);
      copy.splice(nextIndex, 0, item);
      return copy;
    });
  };

  const submitAction = (formData: FormData) => {
    formData.delete("gallery_files");
    for (const item of gallery) {
      if (item.file) formData.append("gallery_files", item.file);
    }
    formAction(formData);
  };

  const seoTitleLen = seoTitle.length;
  const seoDescriptionLen = seoDescription.length;
  const seoTitleAtLimit = seoTitleLen >= SEO_TITLE_MAX;
  const seoDescriptionAtLimit = seoDescriptionLen >= SEO_DESCRIPTION_MAX;
  const seoInvalid = seoTitleLen > SEO_TITLE_MAX || seoDescriptionLen > SEO_DESCRIPTION_MAX;

  const inputClass =
    "w-full rounded-md border border-[#e9ebec] bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#0ab39c] focus:ring-2 focus:ring-[#0ab39c]/20";
  const inputLimitClass =
    "w-full rounded-md border border-rose-400 bg-rose-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20";

  return (
    <form action={submitAction} className="space-y-6">
      {mode === "edit" && initial?.id ? <input type="hidden" name="id" value={initial.id} /> : null}
      <input type="hidden" name="image" value={image} />
      <input type="hidden" name="brochurePdf" value={brochurePdf} />
      <input type="hidden" name="brochureZip" value={brochureZip} />
      <input type="hidden" name="gallery_order" value={galleryOrderJson} />
      <input type="hidden" name="metrics_json" value={metricsJson} />

      {state.error ? (
        <div
          role="alert"
          className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
        >
          {state.error}
        </div>
      ) : null}

      <section className="rounded-lg border border-[#e9ebec] bg-white shadow-sm">
        <div className="border-b border-[#e9ebec] px-5 py-4">
          <h2 className="text-base font-semibold text-slate-800">Temel Bilgiler</h2>
          <p className="mt-1 text-sm text-slate-500">
            Proje başlığı, kategori, özellikler ve yayın durumu
          </p>
        </div>

        <div className="grid gap-5 p-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <label htmlFor="categoryId" className="mb-1.5 block text-sm font-medium text-slate-700">
              Kategori
            </label>
            <SearchableSelect
              id="categoryId"
              name="categoryId"
              value={categoryId}
              onChange={setCategoryId}
              options={categoryOptions}
              placeholder="Kategori ara veya seçin…"
              emptyLabel="— Kategori seçilmedi —"
              searchPlaceholder="Kategori veya alt kategori ara…"
              noResultsLabel="Eşleşen kategori bulunamadı"
            />
            {categoryOptions.length === 0 ? (
              <p className="mt-1.5 text-xs text-amber-600">
                Henüz kategori yok.{" "}
                <Link href="/admin/projects/categories/new" className="font-medium underline">
                  Önce kategori ekleyin
                </Link>
                .
              </p>
            ) : (
              <p className="mt-1.5 text-xs text-slate-400">
                Yazarak arayabilir; ana veya alt kategorilerden birine bağlayabilirsiniz.
              </p>
            )}
          </div>

          <div className="md:col-span-2">
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
              <label className="block text-sm font-medium text-slate-700">Özellikler</label>
              <span className="text-xs text-slate-400">{selectedFeatureIds.length} seçili</span>
            </div>
            {selectedFeatureIds.map((id) => (
              <input key={id} type="hidden" name="featureIds" value={id} />
            ))}
            {featureOptions.length === 0 ? (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                Henüz özellik yok.{" "}
                <Link href="/admin/projects/features/new" className="font-medium underline">
                  Özellik ekleyin
                </Link>
              </p>
            ) : (
              <div className="rounded-md border border-[#e9ebec] bg-[#f3f6f9] p-3">
                <input
                  type="search"
                  value={featureQuery}
                  onChange={(e) => setFeatureQuery(e.target.value)}
                  placeholder="Özellik ara…"
                  className="mb-3 w-full rounded-md border border-[#e9ebec] bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#0ab39c]"
                />
                <div className="admin-scroll-light max-h-48 space-y-1.5 overflow-y-auto pr-1">
                  {filteredFeatures.map((feature) => {
                    const checked = selectedFeatureIds.includes(feature.id);
                    return (
                      <label
                        key={feature.id}
                        className={`flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 transition ${
                          checked
                            ? "border-[#0ab39c]/40 bg-white"
                            : "border-transparent bg-white/70 hover:border-[#e9ebec]"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleFeature(feature.id)}
                          className="h-4 w-4 rounded border-slate-300 text-[#0ab39c] focus:ring-[#0ab39c]"
                        />
                        <span className="min-w-0 flex-1 text-sm font-medium text-slate-700">
                          {feature.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="md:col-span-2">
            <label htmlFor="title" className="mb-1.5 block text-sm font-medium text-slate-700">
              Başlık *
            </label>
            <input
              id="title"
              name="title"
              required
              value={title}
              onChange={(e) => {
                const next = e.target.value;
                setTitle(next);
                if (!slugTouched) setSlug(slugPreview(next));
              }}
              placeholder="Örn. Kurumsal Web Sitesi Tasarımı"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="slug" className="mb-1.5 block text-sm font-medium text-slate-700">
              Slug (URL)
            </label>
            <input
              id="slug"
              name="slug"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
              placeholder="kurumsal-web-sitesi-tasarimi"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="sortOrder" className="mb-1.5 block text-sm font-medium text-slate-700">
              Sıra
            </label>
            <input
              id="sortOrder"
              name="sortOrder"
              type="number"
              defaultValue={
                mode === "create" && initial?.sortOrder === undefined
                  ? ""
                  : (initial?.sortOrder ?? 0)
              }
              placeholder="Boş = otomatik"
              className={inputClass}
            />
          </div>

          <div className="flex flex-wrap gap-3 md:col-span-2">
            <AdminSwitch
              name="isActive"
              label="Aktif (yayında)"
              defaultChecked={initial?.isActive ?? true}
            />
            <AdminSwitch
              name="isFeatured"
              label="Vitrinde öne çıkar"
              defaultChecked={initial?.isFeatured ?? false}
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="summary" className="mb-1.5 block text-sm font-medium text-slate-700">
              Kısa Özet
            </label>
            <RichTextEditor
              id="summary"
              name="summary"
              variant="compact"
              value={initial?.summary ?? ""}
              placeholder="Liste ve kartlarda görünecek kısa açıklama"
              onChange={setSummaryHtml}
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="content" className="mb-1.5 block text-sm font-medium text-slate-700">
              Detay İçerik
            </label>
            <RichTextEditor
              id="content"
              name="content"
              variant="full"
              value={initial?.content ?? ""}
              placeholder="Projenin detaylı açıklaması, kapsam, teknolojiler, süreç vb."
              onChange={setContentHtml}
            />
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-[#e9ebec] bg-white shadow-sm">
        <div className="border-b border-[#e9ebec] px-5 py-4">
          <h2 className="text-base font-semibold text-slate-800">Proje Bağlantısı & Meta</h2>
          <p className="mt-1 text-sm text-slate-500">Canlı URL, yıl, rol ve süre bilgileri</p>
        </div>
        <div className="grid gap-5 p-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <label htmlFor="projectUrl" className="mb-1.5 block text-sm font-medium text-slate-700">
              Canlı site / proje URL
            </label>
            <input
              id="projectUrl"
              name="projectUrl"
              type="url"
              defaultValue={initial?.projectUrl ?? ""}
              placeholder="https://ornek.com"
              className={inputClass}
            />
          </div>
          <div className="md:col-span-2">
            <AdminSwitch
              name="hideProjectUrl"
              label="URL’yi vitrinde gizle (NDA / gizli proje)"
              defaultChecked={initial?.hideProjectUrl ?? false}
            />
          </div>
          <div>
            <label htmlFor="projectYear" className="mb-1.5 block text-sm font-medium text-slate-700">
              Yıl
            </label>
            <input
              id="projectYear"
              name="projectYear"
              type="number"
              min={1990}
              max={2100}
              defaultValue={initial?.projectYear ?? ""}
              placeholder={String(new Date().getFullYear())}
              className={inputClass}
            />
          </div>
          <div>
            <label
              htmlFor="projectDuration"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Süre
            </label>
            <input
              id="projectDuration"
              name="projectDuration"
              defaultValue={initial?.projectDuration ?? ""}
              placeholder="Örn. 3 ay"
              className={inputClass}
            />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="projectRole" className="mb-1.5 block text-sm font-medium text-slate-700">
              Rol
            </label>
            <select
              id="projectRole"
              name="projectRole"
              defaultValue={initial?.projectRole ?? ""}
              className={inputClass}
            >
              <option value="">— Seçilmedi —</option>
              {PROJECT_ROLE_OPTIONS.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-[#e9ebec] bg-white shadow-sm">
        <div className="border-b border-[#e9ebec] px-5 py-4">
          <h2 className="text-base font-semibold text-slate-800">Müşteri</h2>
          <p className="mt-1 text-sm text-slate-500">
            Aynı müşteriye birden fazla proje bağlayabilirsiniz
          </p>
        </div>
        <div className="p-5">
          <label htmlFor="clientId" className="mb-1.5 block text-sm font-medium text-slate-700">
            Müşteri
          </label>
          <SearchableSelect
            id="clientId"
            name="clientId"
            value={clientId}
            onChange={setClientId}
            options={clientOptions.map((client) => ({
              id: client.id,
              label: client.label,
              depth: client.depth ?? 0,
            }))}
            placeholder="Müşteri ara veya seçin…"
            emptyLabel="— Müşteri seçilmedi —"
            searchPlaceholder="Müşteri veya firma ara…"
            noResultsLabel="Eşleşen müşteri bulunamadı"
          />
          {clientOptions.length === 0 ? (
            <p className="mt-1.5 text-xs text-amber-600">
              Henüz müşteri yok.{" "}
              <Link href="/admin/projects/clients/new" className="font-medium underline">
                Önce müşteri ekleyin
              </Link>
              .
            </p>
          ) : (
            <p className="mt-1.5 text-xs text-slate-400">
              Yönetim:{" "}
              <Link href="/admin/projects/clients" className="text-[#405189] hover:underline">
                Müşteriler
              </Link>
            </p>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-[#e9ebec] bg-white shadow-sm">
        <div className="border-b border-[#e9ebec] px-5 py-4">
          <h2 className="text-base font-semibold text-slate-800">Sonuç Metrikleri</h2>
          <p className="mt-1 text-sm text-slate-500">
            En fazla {PROJECT_METRIC_MAX} KPI (ör. Dönüşüm +40%)
          </p>
        </div>
        <div className="space-y-3 p-5">
          {metrics.map((metric, index) => (
            <div key={index} className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
              <input
                value={metric.label}
                onChange={(e) =>
                  setMetrics((prev) =>
                    prev.map((item, i) =>
                      i === index ? { ...item, label: e.target.value } : item,
                    ),
                  )
                }
                placeholder="Etiket (ör. Dönüşüm)"
                className={inputClass}
              />
              <input
                value={metric.value}
                onChange={(e) =>
                  setMetrics((prev) =>
                    prev.map((item, i) =>
                      i === index ? { ...item, value: e.target.value } : item,
                    ),
                  )
                }
                placeholder="Değer (ör. +40%)"
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => setMetrics((prev) => prev.filter((_, i) => i !== index))}
                disabled={metrics.length <= 1}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-[#e9ebec] text-slate-500 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {metrics.length < PROJECT_METRIC_MAX ? (
            <button
              type="button"
              onClick={() => setMetrics((prev) => [...prev, { label: "", value: "" }])}
              className="inline-flex items-center gap-2 rounded-md border border-[#e9ebec] px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Plus className="h-4 w-4" />
              Metrik ekle
            </button>
          ) : null}
        </div>
      </section>

      <section className="rounded-lg border border-[#e9ebec] bg-white shadow-sm">
        <div className="border-b border-[#e9ebec] px-5 py-4">
          <h2 className="text-base font-semibold text-slate-800">SEO</h2>
          <p className="mt-1 text-sm text-slate-500">
            Boş bırakırsanız başlık ve kısa özettten (yoksa detay içerikten) otomatik üretilir.
          </p>
        </div>
        <div className="grid gap-5 p-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <label htmlFor="seoTitle" className="mb-1.5 block text-sm font-medium text-slate-700">
              SEO Başlığı
            </label>
            <input
              id="seoTitle"
              name="seoTitle"
              value={seoTitle}
              maxLength={SEO_TITLE_MAX}
              onChange={(e) => setSeoTitle(clampSeoText(e.target.value, SEO_TITLE_MAX))}
              placeholder={autoSeo.titleAuto ? autoSeo.seoTitle : "SEO başlığı"}
              className={seoTitleAtLimit && seoTitle.trim() ? inputLimitClass : inputClass}
            />
            <p className="mt-1.5 text-xs text-slate-400">
              {seoTitle.trim()
                ? `${seoTitleLen} / ${SEO_TITLE_MAX} karakter`
                : `Otomatik: ${autoSeo.seoTitle}`}
            </p>
          </div>
          <div className="md:col-span-2">
            <label
              htmlFor="seoDescription"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              SEO Açıklaması
            </label>
            <textarea
              id="seoDescription"
              name="seoDescription"
              rows={3}
              value={seoDescription}
              maxLength={SEO_DESCRIPTION_MAX}
              onChange={(e) =>
                setSeoDescription(clampSeoText(e.target.value, SEO_DESCRIPTION_MAX))
              }
              placeholder={
                autoSeo.descriptionAuto ? autoSeo.seoDescription : "SEO açıklaması"
              }
              className={`${
                seoDescriptionAtLimit && seoDescription.trim() ? inputLimitClass : inputClass
              } resize-y`}
            />
            <p className="mt-1.5 text-xs text-slate-400">
              {seoDescription.trim()
                ? `${seoDescriptionLen} / ${SEO_DESCRIPTION_MAX} karakter`
                : `Otomatik: ${autoSeo.seoDescription}`}
            </p>
          </div>
          <div className="md:col-span-2 rounded-lg border border-[#e9ebec] bg-[#f3f6f9] p-4">
            <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
              Arama önizlemesi
            </p>
            <p className="mt-2 truncate text-lg text-[#1a0dab]">{autoSeo.seoTitle}</p>
            <p className="mt-1 line-clamp-2 text-sm text-slate-600">{autoSeo.seoDescription}</p>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-[#e9ebec] bg-white shadow-sm">
        <div className="border-b border-[#e9ebec] px-5 py-4">
          <h2 className="text-base font-semibold text-slate-800">Kapak & Galeri</h2>
          <p className="mt-1 text-sm text-slate-500">
            Kapak görseli ve en fazla {PROJECT_GALLERY_MAX} ekran görüntüsü
          </p>
        </div>
        <div className="space-y-6 p-5">
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">Kapak görseli</p>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="flex h-28 w-40 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-[#e9ebec] bg-[#f3f6f9]">
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt="" className="h-full w-full object-cover" />
                ) : (
                  <ImageIcon className="h-8 w-8 text-slate-300" />
                )}
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={coverUploading || isPending}
                    className="inline-flex items-center gap-2 rounded-md border border-[#e9ebec] px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {coverUploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    {coverUploading ? "Yükleniyor…" : "Kapak Seç"}
                  </button>
                  {preview ? (
                    <button
                      type="button"
                      onClick={() => {
                        setImage("");
                        setPreview("");
                        setCoverUploadError(null);
                        if (fileRef.current) fileRef.current.value = "";
                      }}
                      disabled={coverUploading || isPending}
                      className="inline-flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      Kaldır
                    </button>
                  ) : null}
                </div>
                {coverUploadError ? (
                  <p className="text-xs text-rose-600" role="alert">
                    {coverUploadError}
                  </p>
                ) : (
                  <p className="text-xs text-slate-400">
                    Görsel seçilince hemen yüklenir (en fazla 5 MB). Kaydet yalnızca kayıt
                    bilgilerini gönderir.
                  </p>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file) return;

                    const localPreview = URL.createObjectURL(file);
                    setPreview(localPreview);
                    setCoverUploadError(null);
                    setCoverUploading(true);

                    void uploadAdminMedia(file, "uploads/projects")
                      .then((result) => {
                        setImage(result.url);
                        setPreview(result.url);
                        URL.revokeObjectURL(localPreview);
                      })
                      .catch((error) => {
                        setImage("");
                        setPreview("");
                        URL.revokeObjectURL(localPreview);
                        setCoverUploadError(
                          error instanceof Error
                            ? error.message
                            : "Kapak görseli yüklenemedi.",
                        );
                      })
                      .finally(() => {
                        setCoverUploading(false);
                      });
                  }}
                />
              </div>
            </div>
          </div>

          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-slate-700">Galeri</p>
              <span className="text-xs text-slate-400">
                {gallery.length} / {PROJECT_GALLERY_MAX}
              </span>
            </div>
            {gallery.length > 0 ? (
              <div className="mb-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {gallery.map((item, index) => (
                  <div
                    key={item.key}
                    className="overflow-hidden rounded-lg border border-[#e9ebec] bg-[#f3f6f9]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.preview} alt="" className="h-32 w-full object-cover" />
                    <div className="flex items-center justify-between gap-1 border-t border-[#e9ebec] bg-white p-2">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => moveGalleryItem(index, -1)}
                          disabled={index === 0}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#e9ebec] text-slate-500 disabled:opacity-40"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveGalleryItem(index, 1)}
                          disabled={index === gallery.length - 1}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#e9ebec] text-slate-500 disabled:opacity-40"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setGallery((prev) => prev.filter((_, i) => i !== index))
                        }
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-rose-200 text-rose-500 hover:bg-rose-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mb-3 text-sm text-slate-500">Henüz galeri görseli yok.</p>
            )}
            <button
              type="button"
              disabled={gallery.length >= PROJECT_GALLERY_MAX}
              onClick={() => galleryRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-md border border-[#e9ebec] px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              <Upload className="h-4 w-4" />
              Galeri görseli ekle
            </button>
            <input
              ref={galleryRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                if (files.length === 0) return;
                setGallery((prev) => {
                  const room = PROJECT_GALLERY_MAX - prev.length;
                  const next = files.slice(0, room).map((file) => ({
                    key: newKey(),
                    preview: URL.createObjectURL(file),
                    file,
                  }));
                  return [...prev, ...next];
                });
                e.target.value = "";
              }}
            />
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-[#e9ebec] bg-white shadow-sm">
        <div className="border-b border-[#e9ebec] px-5 py-4">
          <h2 className="text-base font-semibold text-slate-800">
            Detay Sayfası (Sidebar & İçerik)
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Broşür dosyaları, onay maddeleri ve SSS grubu — proje detay sayfasında
            görünür
          </p>
        </div>
        <div className="grid gap-5 p-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <label
              htmlFor="faqGroupId"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              SSS grubu
            </label>
            <SearchableSelect
              id="faqGroupId"
              name="faqGroupId"
              value={faqGroupId}
              onChange={setFaqGroupId}
              options={faqGroupOptions}
              placeholder="SSS grubu seçin…"
              emptyLabel="— SSS gösterme —"
              searchPlaceholder="SSS grubu ara…"
              noResultsLabel="Eşleşen SSS grubu yok"
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">Broşür PDF</p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => brochurePdfRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-md border border-[#e9ebec] px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <Upload className="h-4 w-4" />
                PDF Seç
              </button>
              {brochurePdf ? (
                <>
                  <a
                    href={brochurePdf}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-medium text-[#405189] underline"
                  >
                    Mevcut PDF
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setBrochurePdf("");
                      if (brochurePdfRef.current) brochurePdfRef.current.value = "";
                    }}
                    className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-1.5 text-xs font-medium text-rose-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Kaldır
                  </button>
                </>
              ) : null}
            </div>
            <input
              ref={brochurePdfRef}
              type="file"
              name="brochure_pdf_file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setBrochurePdf(file.name);
              }}
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">Broşür ZIP</p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => brochureZipRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-md border border-[#e9ebec] px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <Upload className="h-4 w-4" />
                ZIP Seç
              </button>
              {brochureZip ? (
                <>
                  <a
                    href={brochureZip.startsWith("/") ? brochureZip : "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-medium text-[#405189] underline"
                  >
                    {brochureZip.startsWith("/") ? "Mevcut ZIP" : brochureZip}
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setBrochureZip("");
                      if (brochureZipRef.current) brochureZipRef.current.value = "";
                    }}
                    className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-1.5 text-xs font-medium text-rose-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Kaldır
                  </button>
                </>
              ) : null}
            </div>
            <input
              ref={brochureZipRef}
              type="file"
              name="brochure_zip_file"
              accept=".zip,application/zip"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setBrochureZip(file.name);
              }}
            />
          </div>

          <div className="md:col-span-2">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-700">
                Onay maddeleri (checklist)
              </p>
              <button
                type="button"
                onClick={() =>
                  setHighlights((prev) =>
                    prev.length >= PROJECT_HIGHLIGHT_MAX ? prev : [...prev, ""],
                  )
                }
                className="inline-flex items-center gap-1.5 rounded-md border border-[#e9ebec] px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                <Plus className="h-3.5 w-3.5" />
                Madde ekle
              </button>
            </div>
            <div className="space-y-2">
              {highlights.map((item, index) => (
                <div key={`highlight-${index}`} className="flex gap-2">
                  <input
                    name="highlights[]"
                    value={item}
                    onChange={(e) => {
                      const next = [...highlights];
                      next[index] = e.target.value;
                      setHighlights(next);
                    }}
                    placeholder={`Madde ${index + 1}`}
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setHighlights((prev) =>
                        prev.length <= 1
                          ? [""]
                          : prev.filter((_, i) => i !== index),
                      )
                    }
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-rose-200 text-rose-500 hover:bg-rose-50"
                    aria-label="Maddeyi sil"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/projects"
          className="rounded-md border border-[#e9ebec] px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Listeye Dön
        </Link>
        <button
          type="submit"
          disabled={isPending || seoInvalid || coverUploading}
          className="inline-flex items-center gap-2 rounded-md bg-[#0ab39c] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#099885] disabled:opacity-70"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {mode === "create" ? "Projeyi Kaydet" : "Değişiklikleri Kaydet"}
        </button>
      </div>
    </form>
  );
}
