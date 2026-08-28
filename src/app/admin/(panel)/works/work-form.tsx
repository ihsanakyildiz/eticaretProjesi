"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ImageIcon, Loader2, Save, Trash2, Upload } from "lucide-react";
import { AdminSwitch } from "@/components/admin/admin-switch";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { SearchableSelect } from "@/components/admin/searchable-select";
import { resolveWorkSeo, SEO_DESCRIPTION_MAX, SEO_TITLE_MAX, clampSeoText } from "@/lib/seo";
import {
  createWorkAction,
  updateWorkAction,
  type WorkFormState,
} from "./actions";

const initialState: WorkFormState = {};

type WorkFormValues = {
  id?: string;
  categoryId?: string | null;
  projectIds?: string[];
  title?: string;
  slug?: string;
  summary?: string;
  content?: string;
  image?: string;
  previewImage?: string;
  sortOrder?: number;
  isActive?: boolean;
  seoTitle?: string;
  seoDescription?: string;
};

type CategoryOption = {
  id: string;
  label: string;
  depth: number;
};

type ProjectOption = {
  id: string;
  label: string;
  isActive: boolean;
  clientName?: string | null;
};

type WorkFormProps = {
  mode: "create" | "edit";
  initial?: WorkFormValues;
  categoryOptions?: CategoryOption[];
  projectOptions?: ProjectOption[];
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

export function WorkForm({
  mode,
  initial,
  categoryOptions = [],
  projectOptions = [],
}: WorkFormProps) {
  const router = useRouter();
  const action = mode === "create" ? createWorkAction : updateWorkAction;
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(initial?.slug));
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>(
    () => initial?.projectIds ?? [],
  );
  const [projectQuery, setProjectQuery] = useState("");
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
  const [previewImage, setPreviewImage] = useState(initial?.previewImage ?? "");
  const [previewScroll, setPreviewScroll] = useState(initial?.previewImage ?? "");
  const fileRef = useRef<HTMLInputElement>(null);
  const previewFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.success) {
      router.push("/admin/works");
      router.refresh();
    }
  }, [state.success, router]);

  const autoSeo = useMemo(
    () =>
      resolveWorkSeo({
        title,
        summary: summaryHtml,
        content: contentHtml,
        seoTitle,
        seoDescription,
      }),
    [title, summaryHtml, contentHtml, seoTitle, seoDescription],
  );

  const filteredProjects = useMemo(() => {
    const needle = projectQuery
      .toLocaleLowerCase("tr-TR")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
    if (!needle) return projectOptions;
    return projectOptions.filter((project) => {
      const haystack = [project.label, project.clientName ?? ""]
        .join(" ")
        .toLocaleLowerCase("tr-TR")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      return haystack.includes(needle);
    });
  }, [projectOptions, projectQuery]);

  const toggleProject = (projectId: string) => {
    setSelectedProjectIds((prev) =>
      prev.includes(projectId)
        ? prev.filter((id) => id !== projectId)
        : [...prev, projectId],
    );
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
    <form action={formAction} className="space-y-6">
      {mode === "edit" && initial?.id ? <input type="hidden" name="id" value={initial.id} /> : null}
      <input type="hidden" name="image" value={image} />
      <input type="hidden" name="previewImage" value={previewImage} />

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
            Hizmet / çalışma başlığı, kategori ve yayın durumu
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
                <Link href="/admin/works/categories/new" className="font-medium underline">
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
              <label className="block text-sm font-medium text-slate-700">
                İlişkili Projeler
              </label>
              <span className="text-xs text-slate-400">
                {selectedProjectIds.length} seçili
              </span>
            </div>
            {selectedProjectIds.map((id) => (
              <input key={id} type="hidden" name="projectIds" value={id} />
            ))}
            {projectOptions.length === 0 ? (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                Henüz proje yok.{" "}
                <Link href="/admin/projects/new" className="font-medium underline">
                  Proje ekleyin
                </Link>{" "}
                — bu alan isteğe bağlıdır.
              </p>
            ) : (
              <div className="rounded-md border border-[#e9ebec] bg-[#f3f6f9] p-3">
                <input
                  type="search"
                  value={projectQuery}
                  onChange={(e) => setProjectQuery(e.target.value)}
                  placeholder="Proje veya müşteri ara…"
                  className="mb-3 w-full rounded-md border border-[#e9ebec] bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#0ab39c]"
                />
                <div className="admin-scroll-light max-h-52 space-y-1.5 overflow-y-auto pr-1">
                  {filteredProjects.length === 0 ? (
                    <p className="px-1 py-2 text-xs text-slate-500">Eşleşen proje yok.</p>
                  ) : (
                    filteredProjects.map((project) => {
                      const checked = selectedProjectIds.includes(project.id);
                      return (
                        <label
                          key={project.id}
                          className={`flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 transition ${
                            checked
                              ? "border-[#0ab39c]/40 bg-white"
                              : "border-transparent bg-white/70 hover:border-[#e9ebec]"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleProject(project.id)}
                            className="h-4 w-4 rounded border-slate-300 text-[#0ab39c] focus:ring-[#0ab39c]"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium text-slate-700">
                              {project.label}
                            </span>
                            {project.clientName ? (
                              <span className="block text-xs text-slate-400">
                                {project.clientName}
                              </span>
                            ) : null}
                          </span>
                          {!project.isActive ? (
                            <span className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                              Pasif
                            </span>
                          ) : null}
                        </label>
                      );
                    })
                  )}
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  Bu çalışmayı gösteren portföy projelerini seçin (isteğe bağlı). Yönetim:{" "}
                  <Link href="/admin/projects" className="text-[#405189] hover:underline">
                    Projeler
                  </Link>
                </p>
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
            <p className="mt-1.5 text-xs text-slate-400">Boş bırakılırsa başlıktan otomatik üretilir.</p>
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
            <p className="mt-1.5 text-xs text-slate-400">
              Boş bırakılırsa aynı kategorideki son sıranın ardına eklenir.
            </p>
          </div>

          <div className="flex items-end md:col-span-2">
            <AdminSwitch
              name="isActive"
              label="Aktif (yayında)"
              defaultChecked={initial?.isActive ?? true}
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
              placeholder="Hizmetin detaylı açıklaması, kapsam, süreç vb."
              onChange={setContentHtml}
            />
          </div>
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
              aria-invalid={seoTitleAtLimit && Boolean(seoTitle.trim())}
            />
            <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
              <p
                className={`text-xs ${
                  seoTitleAtLimit && seoTitle.trim()
                    ? "font-medium text-rose-600"
                    : "text-slate-400"
                }`}
              >
                {seoTitle.trim()
                  ? seoTitleAtLimit
                    ? `Karakter limiti aşılamaz — en fazla ${SEO_TITLE_MAX} karakter`
                    : `${seoTitleLen} / ${SEO_TITLE_MAX} karakter`
                  : `Otomatik: ${autoSeo.seoTitle}`}
              </p>
              {seoTitle.trim() ? (
                <span
                  className={`text-xs tabular-nums ${
                    seoTitleAtLimit ? "font-semibold text-rose-600" : "text-slate-400"
                  }`}
                >
                  {seoTitleLen}/{SEO_TITLE_MAX}
                </span>
              ) : null}
            </div>
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
              aria-invalid={seoDescriptionAtLimit && Boolean(seoDescription.trim())}
            />
            <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
              <p
                className={`text-xs ${
                  seoDescriptionAtLimit && seoDescription.trim()
                    ? "font-medium text-rose-600"
                    : "text-slate-400"
                }`}
              >
                {seoDescription.trim()
                  ? seoDescriptionAtLimit
                    ? `Karakter limiti aşılamaz — en fazla ${SEO_DESCRIPTION_MAX} karakter`
                    : `${seoDescriptionLen} / ${SEO_DESCRIPTION_MAX} karakter`
                  : `Otomatik: ${autoSeo.seoDescription}`}
              </p>
              {seoDescription.trim() ? (
                <span
                  className={`text-xs tabular-nums ${
                    seoDescriptionAtLimit ? "font-semibold text-rose-600" : "text-slate-400"
                  }`}
                >
                  {seoDescriptionLen}/{SEO_DESCRIPTION_MAX}
                </span>
              ) : null}
            </div>
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
          <h2 className="text-base font-semibold text-slate-800">Görseller</h2>
          <p className="mt-1 text-sm text-slate-500">
            Kapak görseli ve ana sayfa hover kaydırması için tam sayfa ekran görüntüsü
          </p>
        </div>
        <div className="space-y-8 p-5">
          <div>
            <p className="mb-3 text-sm font-medium text-slate-700">Kapak görseli</p>
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
                    className="inline-flex items-center gap-2 rounded-md border border-[#e9ebec] px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Upload className="h-4 w-4" />
                    Görsel Seç
                  </button>
                  {preview ? (
                    <button
                      type="button"
                      onClick={() => {
                        setImage("");
                        setPreview("");
                        if (fileRef.current) fileRef.current.value = "";
                      }}
                      className="inline-flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                      Kaldır
                    </button>
                  ) : null}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  name="image_file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setPreview(URL.createObjectURL(file));
                  }}
                />
                <p className="text-xs text-slate-400">
                  PNG, JPG veya WEBP — kayıtta WebP’ye çevrilir.
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-[#e9ebec] pt-6">
            <p className="mb-1 text-sm font-medium text-slate-700">
              Tam sayfa site görseli (ana sayfa hover)
            </p>
            <p className="mb-3 text-xs text-slate-400">
              Web sitesinin uzun ekran görüntüsünü yükleyin. Ana sayfada kartın üzerine
              gelince görsel tarayıcı gibi aşağı kayar.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="flex h-40 w-28 shrink-0 items-start justify-center overflow-hidden rounded-lg border border-dashed border-[#e9ebec] bg-[#f3f6f9]">
                {previewScroll ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewScroll}
                    alt=""
                    className="w-full object-cover object-top"
                  />
                ) : (
                  <ImageIcon className="mt-12 h-8 w-8 text-slate-300" />
                )}
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => previewFileRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-md border border-[#e9ebec] px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Upload className="h-4 w-4" />
                    Tam Sayfa Görsel Seç
                  </button>
                  {previewScroll ? (
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewImage("");
                        setPreviewScroll("");
                        if (previewFileRef.current) previewFileRef.current.value = "";
                      }}
                      className="inline-flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                      Kaldır
                    </button>
                  ) : null}
                </div>
                <input
                  ref={previewFileRef}
                  type="file"
                  name="preview_image_file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setPreviewScroll(URL.createObjectURL(file));
                  }}
                />
                <p className="text-xs text-slate-400">
                  Uzun ekran görüntüsü önerilir (en fazla ~12 MB).
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/works"
          className="rounded-md border border-[#e9ebec] px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Listeye Dön
        </Link>
        <button
          type="submit"
          disabled={isPending || seoInvalid}
          className="inline-flex items-center gap-2 rounded-md bg-[#0ab39c] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#099885] disabled:opacity-70"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {mode === "create" ? "Çalışmayı Kaydet" : "Değişiklikleri Kaydet"}
        </button>
      </div>
    </form>
  );
}
