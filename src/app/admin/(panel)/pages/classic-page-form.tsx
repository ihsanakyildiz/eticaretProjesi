"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ImageIcon, Loader2, Save, Trash2, Upload } from "lucide-react";
import { AdminSwitch } from "@/components/admin/admin-switch";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { uploadAdminMedia } from "@/components/admin/upload-admin-media";
import { resolvePageSeo, SEO_DESCRIPTION_MAX, SEO_TITLE_MAX, clampSeoText } from "@/lib/seo";
import {
  createClassicPageAction,
  updateClassicPageAction,
  type PageFormState,
} from "./actions";
import {
  RelatedContentPicker,
  type RelatedContentOption,
} from "./related-content-picker";

const initialState: PageFormState = {};

type ClassicPageFormValues = {
  id?: string;
  title?: string;
  slug?: string;
  summary?: string;
  content?: string;
  image?: string;
  sortOrder?: number;
  isActive?: boolean;
  sidebarEnabled?: boolean;
  seoTitle?: string;
  seoDescription?: string;
  workIds?: string[];
  projectIds?: string[];
  postIds?: string[];
};

type ClassicPageFormProps = {
  mode: "create" | "edit";
  initial?: ClassicPageFormValues;
  workOptions?: RelatedContentOption[];
  projectOptions?: RelatedContentOption[];
  postOptions?: RelatedContentOption[];
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

export function ClassicPageForm({
  mode,
  initial,
  workOptions = [],
  projectOptions = [],
  postOptions = [],
}: ClassicPageFormProps) {
  const router = useRouter();
  const action = mode === "create" ? createClassicPageAction : updateClassicPageAction;
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(initial?.slug));
  const [selectedWorkIds, setSelectedWorkIds] = useState<string[]>(
    () => initial?.workIds ?? [],
  );
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>(
    () => initial?.projectIds ?? [],
  );
  const [selectedPostIds, setSelectedPostIds] = useState<string[]>(
    () => initial?.postIds ?? [],
  );
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
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.success) {
      router.push("/admin/pages");
      router.refresh();
    }
  }, [state.success, router]);

  const autoSeo = useMemo(
    () =>
      resolvePageSeo({
        title,
        summary: summaryHtml,
        content: contentHtml,
        seoTitle,
        seoDescription,
      }),
    [title, summaryHtml, contentHtml, seoTitle, seoDescription],
  );

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
            Sayfa başlığı, içerik ve yayın durumu
          </p>
        </div>

        <div className="grid gap-5 p-5 md:grid-cols-2">
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
              placeholder="Örn. Hakkımızda"
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
              placeholder="hakkimizda"
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
          </div>

          <div className="flex flex-col gap-4 md:col-span-2 md:flex-row md:items-end md:gap-8">
            <AdminSwitch
              name="isActive"
              label="Aktif (yayında)"
              defaultChecked={initial?.isActive ?? true}
            />
            <AdminSwitch
              name="sidebarEnabled"
              label="Sidebar göster"
              description="Bu sayfada site kenar çubuğunu göster"
              defaultChecked={initial?.sidebarEnabled ?? true}
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
              Sayfa İçeriği
            </label>
            <RichTextEditor
              id="content"
              name="content"
              variant="full"
              value={initial?.content ?? ""}
              placeholder="Hakkımızda, misyon, iletişim vb. klasik sayfa içeriği…"
              onChange={setContentHtml}
            />
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-[#e9ebec] bg-white shadow-sm">
        <div className="border-b border-[#e9ebec] px-5 py-4">
          <h2 className="text-base font-semibold text-slate-800">İlişkili İçerikler</h2>
          <p className="mt-1 text-sm text-slate-500">
            Bu sayfada göstermek istediğiniz çalışmalar, projeler ve blog yazılarını seçin.
          </p>
        </div>
        <div className="grid gap-5 p-5">
          <RelatedContentPicker
            title="Yapılan İşler / Çalışmalar"
            fieldName="workIds"
            options={workOptions}
            selectedIds={selectedWorkIds}
            onChange={setSelectedWorkIds}
            emptyHref="/admin/works/new"
            emptyLabel="Henüz çalışma yok."
            manageHref="/admin/works"
            manageLabel="Çalışmalar"
            searchPlaceholder="Çalışma ara…"
            hint="Seçilen çalışmalar bu sayfada listelenir."
          />
          <RelatedContentPicker
            title="Projeler"
            fieldName="projectIds"
            options={projectOptions}
            selectedIds={selectedProjectIds}
            onChange={setSelectedProjectIds}
            emptyHref="/admin/projects/new"
            emptyLabel="Henüz proje yok."
            manageHref="/admin/projects"
            manageLabel="Projeler"
            searchPlaceholder="Proje veya müşteri ara…"
            hint="Seçilen projeler bu sayfada listelenir."
          />
          <RelatedContentPicker
            title="Blog Yazıları"
            fieldName="postIds"
            options={postOptions}
            selectedIds={selectedPostIds}
            onChange={setSelectedPostIds}
            emptyHref="/admin/blog/posts/new"
            emptyLabel="Henüz yazı yok."
            manageHref="/admin/blog/posts"
            manageLabel="Yazılar"
            searchPlaceholder="Yazı ara…"
            hint="Seçilen yazılar bu sayfada listelenir."
          />
        </div>
      </section>

      <section className="rounded-lg border border-[#e9ebec] bg-white shadow-sm">
        <div className="border-b border-[#e9ebec] px-5 py-4">
          <h2 className="text-base font-semibold text-slate-800">SEO</h2>
          <p className="mt-1 text-sm text-slate-500">
            Boş bırakırsanız başlık ve kısa özettten (yoksa içerikten) otomatik üretilir.
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
          <h2 className="text-base font-semibold text-slate-800">Görsel</h2>
          <p className="mt-1 text-sm text-slate-500">Kapak görseli (otomatik WebP)</p>
        </div>
        <div className="p-5">
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
                  className="inline-flex items-center gap-2 rounded-md border border-[#e9ebec] px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  {coverUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {coverUploading ? "Yükleniyor..." : "Görsel Seç"}
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
                    className="inline-flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600 disabled:opacity-60"
                  >
                    <Trash2 className="h-4 w-4" />
                    Kaldır
                  </button>
                ) : null}
              </div>
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

                  void uploadAdminMedia(file, "uploads/pages")
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
              {coverUploadError ? (
                <p className="text-xs text-rose-600" role="alert">
                  {coverUploadError}
                </p>
              ) : (
                <p className="text-xs text-slate-400">
                  Görsel seçilince hemen yüklenir (en fazla 5 MB). Kaydet yalnızca sayfa
                  bilgilerini gönderir.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/pages"
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
          {mode === "create" ? "Sayfayı Kaydet" : "Değişiklikleri Kaydet"}
        </button>
      </div>
    </form>
  );
}
