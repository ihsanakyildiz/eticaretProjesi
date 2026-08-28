"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Eye,
  EyeOff,
  GripVertical,
  Loader2,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { AdminSwitch } from "@/components/admin/admin-switch";
import { ContactFormFieldsEditor } from "@/components/admin/contact-form-fields-editor";
import { GridRowEditor } from "@/components/admin/grid-row-editor";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import {
  getDefaultContactFormConfig,
} from "@/config/contact-form";
import {
  getDefaultContactInfoBlockConfig,
} from "@/config/contact-info-block";
import {
  defaultLimitForType,
  getContactFormSettings,
  getContactInfoBlockSettings,
  getPageSectionTypeMeta,
  PAGE_SECTION_TYPE_META,
  CARD_SLIDER_EFFECTS,
  CARD_COLUMNS_OPTIONS,
  parseSectionSettings,
  sectionSupportsEyebrow,
  type PageSectionTypeValue,
} from "@/lib/page-sections";
import {
  addPageSectionAction,
  deletePageSectionAction,
  reorderPageSectionsAction,
  togglePageSectionActiveAction,
  updatePageSectionAction,
  type SectionFormState,
} from "./actions";
import {
  RelatedContentPicker,
  type RelatedContentOption,
} from "./related-content-picker";

export type BuilderSection = {
  id: string;
  type: PageSectionTypeValue;
  parentId: string | null;
  label: string | null;
  title: string | null;
  subtitle: string | null;
  content: string | null;
  settings: string | null;
  sortOrder: number;
  isActive: boolean;
  heroId: string | null;
  faqGroupId: string | null;
  projectCategoryId: string | null;
  workCategoryId: string | null;
  blogCategoryId: string | null;
  cardIds: string[];
  projectIds: string[];
  postIds: string[];
  workIds: string[];
};

export type SelectOption = { id: string; label: string };

type PageBuilderProps = {
  pageId: string;
  sections: BuilderSection[];
  cardOptions: RelatedContentOption[];
  advancedCardOptions: RelatedContentOption[];
  projectOptions: RelatedContentOption[];
  postOptions: RelatedContentOption[];
  workOptions: RelatedContentOption[];
  heroOptions: SelectOption[];
  faqOptions: SelectOption[];
  projectCategoryOptions: SelectOption[];
  workCategoryOptions: SelectOption[];
  blogCategoryOptions: SelectOption[];
};

type BuilderOptions = Omit<PageBuilderProps, "pageId" | "sections">;

const sectionInitial: SectionFormState = {};

function SectionEditor({
  section,
  hideHeaderFields = false,
  cardOptions,
  advancedCardOptions,
  projectOptions,
  postOptions,
  workOptions,
  heroOptions,
  faqOptions,
  projectCategoryOptions,
  workCategoryOptions,
  blogCategoryOptions,
}: {
  section: BuilderSection;
  hideHeaderFields?: boolean;
} & BuilderOptions) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    updatePageSectionAction,
    sectionInitial,
  );
  const settings = useMemo(
    () => parseSectionSettings(section.settings),
    [section.settings],
  );
  const [contentHtml, setContentHtml] = useState(section.content ?? "");
  const [selectedCardIds, setSelectedCardIds] = useState(section.cardIds);
  const [selectedProjectIds, setSelectedProjectIds] = useState(section.projectIds);
  const [selectedPostIds, setSelectedPostIds] = useState(section.postIds);
  const [selectedWorkIds, setSelectedWorkIds] = useState(section.workIds);
  const meta = getPageSectionTypeMeta(section.type);

  useEffect(() => {
    if (state.success) router.refresh();
  }, [state.success, router]);

  return (
    <form action={formAction} className="space-y-4 border-t border-[#e9ebec] pt-4">
      <input type="hidden" name="sectionId" value={section.id} />

      {state.error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {state.error}
        </p>
      ) : null}
      {state.success && state.message ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          {state.message}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {!hideHeaderFields ? (
          <>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Admin etiketi
              </label>
              <input
                name="label"
                defaultValue={section.label ?? meta.defaultLabel}
                className="w-full rounded-md border border-[#e9ebec] px-3 py-2 text-sm outline-none focus:border-[#405189]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Anchor / id (opsiyonel)
              </label>
              <input
                name="anchorId"
                defaultValue={settings.anchorId ?? ""}
                placeholder="ornek: hizmetler"
                className="w-full rounded-md border border-[#e9ebec] px-3 py-2 text-sm outline-none focus:border-[#405189]"
              />
            </div>
            {sectionSupportsEyebrow(section.type) ? (
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Üst etiket / rozet
                </label>
                <input
                  name="eyebrow"
                  defaultValue={settings.eyebrow ?? ""}
                  placeholder={
                    section.type === "CARDS"
                      ? "••• Hizmetlerimiz"
                      : section.type === "PROJECTS"
                        ? "Neden En İyisiyiz"
                        : section.type === "WORKS"
                          ? "••• Yapılan İşler"
                          : "Neden biz?"
                  }
                  className="w-full rounded-md border border-[#e9ebec] px-3 py-2 text-sm outline-none focus:border-[#405189]"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  Başlığın üzerindeki küçük mor etiket metni.
                </p>
              </div>
            ) : null}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Bölüm başlığı
              </label>
              <input
                name="title"
                defaultValue={section.title ?? ""}
                className="w-full rounded-md border border-[#e9ebec] px-3 py-2 text-sm outline-none focus:border-[#405189]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Alt başlık
              </label>
              <input
                name="subtitle"
                defaultValue={section.subtitle ?? ""}
                className="w-full rounded-md border border-[#e9ebec] px-3 py-2 text-sm outline-none focus:border-[#405189]"
              />
            </div>
          </>
        ) : (
          <>
            <input type="hidden" name="label" value={section.label ?? meta.defaultLabel} />
            <input type="hidden" name="title" value={section.title ?? ""} />
            <input type="hidden" name="subtitle" value={section.subtitle ?? ""} />
            {sectionSupportsEyebrow(section.type) ? (
              <input type="hidden" name="eyebrow" value={settings.eyebrow ?? ""} />
            ) : null}
            <input type="hidden" name="anchorId" value={settings.anchorId ?? ""} />
          </>
        )}
      </div>

      {section.type === "HERO" ? (
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Hero alanı
          </label>
          <select
            name="heroId"
            defaultValue={section.heroId ?? ""}
            className="w-full rounded-md border border-[#e9ebec] px-3 py-2 text-sm outline-none focus:border-[#405189]"
          >
            <option value="">Seçin…</option>
            {heroOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {section.type === "FAQ" ? (
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            SSS grubu
          </label>
          <select
            name="faqGroupId"
            defaultValue={section.faqGroupId ?? ""}
            className="w-full rounded-md border border-[#e9ebec] px-3 py-2 text-sm outline-none focus:border-[#405189]"
          >
            <option value="">Seçin…</option>
            {faqOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {section.type === "CARDS" ? (
        <>
          <RelatedContentPicker
            title="Gösterilecek kartlar"
            fieldName="cardIds"
            options={cardOptions}
            selectedIds={selectedCardIds}
            onChange={setSelectedCardIds}
            emptyHref="/admin/cards/new"
            emptyLabel="Henüz klasik kart yok."
            manageHref="/admin/cards"
            manageLabel="Kartları yönet"
            searchPlaceholder="Kart ara…"
            hint="Seçim yoksa aktif klasik kartlar otomatik listelenir."
          />

          <div className="rounded-lg border border-[#e9ebec] bg-[#f8f9fb] p-4 space-y-4">
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Alt butonlar
            </p>
            <AdminSwitch
              name="showPrimaryCta"
              label="Birincil butonu göster (Keşfet)"
              defaultChecked={settings.showPrimaryCta !== false}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Birincil buton metni
                </label>
                <input
                  name="primaryCtaLabel"
                  defaultValue={settings.primaryCtaLabel ?? "Keşfet"}
                  className="w-full rounded-md border border-[#e9ebec] px-3 py-2 text-sm outline-none focus:border-[#405189]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Birincil buton URL
                </label>
                <input
                  name="primaryCtaUrl"
                  defaultValue={settings.primaryCtaUrl ?? "/hizmetler"}
                  className="w-full rounded-md border border-[#e9ebec] px-3 py-2 text-sm outline-none focus:border-[#405189]"
                />
              </div>
            </div>
            <AdminSwitch
              name="showSecondaryCta"
              label="İkincil butonu göster (Bize Ulaşın)"
              defaultChecked={settings.showSecondaryCta !== false}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  İkincil buton metni
                </label>
                <input
                  name="secondaryCtaLabel"
                  defaultValue={settings.secondaryCtaLabel ?? "Bize Ulaşın"}
                  className="w-full rounded-md border border-[#e9ebec] px-3 py-2 text-sm outline-none focus:border-[#405189]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  İkincil buton URL
                </label>
                <input
                  name="secondaryCtaUrl"
                  defaultValue={settings.secondaryCtaUrl ?? "/iletisim"}
                  className="w-full rounded-md border border-[#e9ebec] px-3 py-2 text-sm outline-none focus:border-[#405189]"
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-[#e9ebec] bg-[#f8f9fb] p-4 space-y-4">
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Slider (Swiper)
            </p>
            <AdminSwitch
              name="enableSlider"
              label="Kartları kaydırmalı slider olarak göster"
              description="Kapalıysa klasik ızgara düzeni kullanılır."
              defaultChecked={settings.enableSlider === true}
            />
            <AdminSwitch
              name="sliderAutoplay"
              label="Otomatik kaydır"
              defaultChecked={settings.sliderAutoplay !== false}
            />
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Geçiş animasyonu
              </label>
              <select
                name="sliderEffect"
                defaultValue={settings.sliderEffect ?? "slide"}
                className="w-full max-w-xs rounded-md border border-[#e9ebec] px-3 py-2 text-sm outline-none focus:border-[#405189]"
              >
                {CARD_SLIDER_EFFECTS.map((effect) => (
                  <option key={effect.value} value={effect.value}>
                    {effect.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </>
      ) : null}

      {section.type === "ADVANCED_CARD" ? (
        <RelatedContentPicker
          title="Gelişmiş kart (ilk seçilen kullanılır)"
          fieldName="cardIds"
          options={advancedCardOptions}
          selectedIds={selectedCardIds}
          onChange={setSelectedCardIds}
          emptyHref="/admin/cards/new"
          emptyLabel="Henüz gelişmiş kart yok."
          manageHref="/admin/cards"
          manageLabel="Kartları yönet"
          searchPlaceholder="Kart ara…"
          hint="Birden fazla seçerseniz sıradaki ilk kart gösterilir."
        />
      ) : null}

      {section.type === "PROJECTS" ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Proje kategorisi
              </label>
              <select
                name="projectCategoryId"
                defaultValue={section.projectCategoryId ?? ""}
                className="w-full rounded-md border border-[#e9ebec] px-3 py-2 text-sm outline-none focus:border-[#405189]"
              >
                <option value="">Tümü / seçili projeler</option>
                {projectCategoryOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Limit
              </label>
              <input
                type="number"
                name="limit"
                min={1}
                max={48}
                defaultValue={settings.limit ?? defaultLimitForType("PROJECTS")}
                className="w-full rounded-md border border-[#e9ebec] px-3 py-2 text-sm outline-none focus:border-[#405189]"
              />
            </div>
          </div>
          <AdminSwitch
            name="showFeatures"
            label="Anasayfa özellik accordion’unu göster"
            defaultChecked={settings.showFeatures !== false}
          />
          <div className="rounded-lg border border-[#e9ebec] bg-[#f8f9fb] p-4 space-y-3">
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Sol istatistik alanı
            </p>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Büyük değer
              </label>
              <input
                name="statValue"
                defaultValue={settings.statValue ?? ""}
                placeholder="50k+"
                className="w-full rounded-md border border-[#e9ebec] px-3 py-2 text-sm outline-none focus:border-[#405189]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Açıklama
              </label>
              <textarea
                name="statDescription"
                rows={3}
                defaultValue={settings.statDescription ?? ""}
                placeholder="Binlerce saatlik tasarım ve geliştirme deneyimiyle markaların dijital dönüşümüne eşlik ediyoruz."
                className="w-full rounded-md border border-[#e9ebec] px-3 py-2 text-sm outline-none focus:border-[#405189]"
              />
            </div>
          </div>
          <RelatedContentPicker
            title="Elle seçilen projeler (opsiyonel)"
            fieldName="projectIds"
            options={projectOptions}
            selectedIds={selectedProjectIds}
            onChange={setSelectedProjectIds}
            emptyHref="/admin/projects/new"
            emptyLabel="Henüz proje yok."
            manageHref="/admin/projects"
            manageLabel="Projeleri yönet"
            searchPlaceholder="Proje ara…"
            hint="Seçim varsa kategori yerine bu liste kullanılır."
          />
        </>
      ) : null}

      {section.type === "WORKS" ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                İş kategorisi
              </label>
              <select
                name="workCategoryId"
                defaultValue={section.workCategoryId ?? ""}
                className="w-full rounded-md border border-[#e9ebec] px-3 py-2 text-sm outline-none focus:border-[#405189]"
              >
                <option value="">Tümü / seçili işler</option>
                {workCategoryOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Limit
              </label>
              <input
                type="number"
                name="limit"
                min={1}
                max={48}
                defaultValue={settings.limit ?? defaultLimitForType("WORKS")}
                className="w-full rounded-md border border-[#e9ebec] px-3 py-2 text-sm outline-none focus:border-[#405189]"
              />
            </div>
          </div>
          <RelatedContentPicker
            title="Elle seçilen işler (opsiyonel)"
            fieldName="workIds"
            options={workOptions}
            selectedIds={selectedWorkIds}
            onChange={setSelectedWorkIds}
            emptyHref="/admin/works/new"
            emptyLabel="Henüz yapılan iş yok."
            manageHref="/admin/works"
            manageLabel="İşleri yönet"
            searchPlaceholder="İş ara…"
            hint="Seçim varsa kategori yerine bu liste kullanılır."
          />
        </>
      ) : null}

      {section.type === "BLOG" ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Blog kategorisi
              </label>
              <select
                name="blogCategoryId"
                defaultValue={section.blogCategoryId ?? ""}
                className="w-full rounded-md border border-[#e9ebec] px-3 py-2 text-sm outline-none focus:border-[#405189]"
              >
                <option value="">Tümü / seçili yazılar</option>
                {blogCategoryOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Limit
              </label>
              <input
                type="number"
                name="limit"
                min={1}
                max={48}
                defaultValue={settings.limit ?? defaultLimitForType("BLOG")}
                className="w-full rounded-md border border-[#e9ebec] px-3 py-2 text-sm outline-none focus:border-[#405189]"
              />
            </div>
          </div>
          <RelatedContentPicker
            title="Elle seçilen yazılar (opsiyonel)"
            fieldName="postIds"
            options={postOptions}
            selectedIds={selectedPostIds}
            onChange={setSelectedPostIds}
            emptyHref="/admin/blog/posts/new"
            emptyLabel="Henüz yazı yok."
            manageHref="/admin/blog/posts"
            manageLabel="Yazıları yönet"
            searchPlaceholder="Yazı ara…"
            hint="Seçim varsa kategori yerine bu liste kullanılır."
          />
          <div className="rounded-lg border border-[#e9ebec] bg-[#f8f9fb] p-4 space-y-4">
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Slider (Swiper)
            </p>
            <AdminSwitch
              name="enableSlider"
              label="Yazıları kaydırmalı slider olarak göster"
              description="Kapalıysa klasik ızgara düzeni kullanılır."
              defaultChecked={settings.enableSlider === true}
            />
            <AdminSwitch
              name="sliderAutoplay"
              label="Otomatik kaydır"
              defaultChecked={settings.sliderAutoplay !== false}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Geçiş animasyonu
                </label>
                <select
                  name="sliderEffect"
                  defaultValue={settings.sliderEffect ?? "slide"}
                  className="w-full rounded-md border border-[#e9ebec] px-3 py-2 text-sm outline-none focus:border-[#405189]"
                >
                  {CARD_SLIDER_EFFECTS.map((effect) => (
                    <option key={effect.value} value={effect.value}>
                      {effect.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Yan yana kart sayısı
                </label>
                <select
                  name="cardsPerRow"
                  defaultValue={String(settings.cardsPerRow ?? 3)}
                  className="w-full rounded-md border border-[#e9ebec] px-3 py-2 text-sm outline-none focus:border-[#405189]"
                >
                  {CARD_COLUMNS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </>
      ) : null}

      {section.type === "CARDS" || section.type === "ADVANCED_CARD" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Limit
            </label>
            <input
              type="number"
              name="limit"
              min={1}
              max={48}
              defaultValue={settings.limit ?? defaultLimitForType(section.type)}
              className="w-full rounded-md border border-[#e9ebec] px-3 py-2 text-sm outline-none focus:border-[#405189]"
            />
          </div>
          {section.type === "CARDS" ? (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Yan yana kart sayısı
              </label>
              <select
                name="cardsPerRow"
                defaultValue={String(settings.cardsPerRow ?? 3)}
                className="w-full rounded-md border border-[#e9ebec] px-3 py-2 text-sm outline-none focus:border-[#405189]"
              >
                {CARD_COLUMNS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>
      ) : null}

      {section.type === "PRICING" ? (
        <div className="rounded-lg border border-[#e9ebec] bg-[#f8f9fb] p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Alt CTA butonları
            </p>
            <Link
              href="/admin/pricing"
              className="text-xs font-semibold text-[#405189] hover:underline"
            >
              Paketleri yönet →
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Birincil buton metni
              </label>
              <input
                name="pricingPrimaryCtaLabel"
                defaultValue={
                  settings.pricingPrimaryCtaLabel ?? "Ücretsiz Teklif Alın"
                }
                className="w-full rounded-md border border-[#e9ebec] px-3 py-2 text-sm outline-none focus:border-[#405189]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Birincil buton URL
              </label>
              <input
                name="pricingPrimaryCtaUrl"
                defaultValue={settings.pricingPrimaryCtaUrl ?? "/iletisim"}
                className="w-full rounded-md border border-[#e9ebec] px-3 py-2 text-sm outline-none focus:border-[#405189]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                İkincil buton metni
              </label>
              <input
                name="pricingSecondaryCtaLabel"
                defaultValue={
                  settings.pricingSecondaryCtaLabel ?? "Nasıl çalışıyoruz?"
                }
                className="w-full rounded-md border border-[#e9ebec] px-3 py-2 text-sm outline-none focus:border-[#405189]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                İkincil buton URL
              </label>
              <input
                name="pricingSecondaryCtaUrl"
                defaultValue={settings.pricingSecondaryCtaUrl ?? "/hakkimizda"}
                className="w-full rounded-md border border-[#e9ebec] px-3 py-2 text-sm outline-none focus:border-[#405189]"
              />
            </div>
          </div>
        </div>
      ) : null}

      {section.type === "RICH_TEXT" || section.type === "CTA" ? (
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            İçerik
          </label>
          <RichTextEditor
            name="content"
            value={contentHtml}
            onChange={setContentHtml}
            variant={section.type === "CTA" ? "compact" : "full"}
          />
        </div>
      ) : null}

      {section.type === "CTA" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Buton metni
            </label>
            <input
              name="ctaLabel"
              defaultValue={settings.ctaLabel ?? ""}
              className="w-full rounded-md border border-[#e9ebec] px-3 py-2 text-sm outline-none focus:border-[#405189]"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Buton URL
            </label>
            <input
              name="ctaUrl"
              defaultValue={settings.ctaUrl ?? ""}
              className="w-full rounded-md border border-[#e9ebec] px-3 py-2 text-sm outline-none focus:border-[#405189]"
            />
          </div>
        </div>
      ) : null}

      {section.type === "CONTACT_FORM" ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Gönder butonu metni
              </label>
              <input
                name="contactSubmitLabel"
                defaultValue={
                  getContactFormSettings(settings).submitLabel ??
                  getDefaultContactFormConfig().submitLabel
                }
                className="w-full rounded-md border border-[#e9ebec] px-3 py-2 text-sm outline-none focus:border-[#405189]"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Başarı mesajı
              </label>
              <input
                name="contactSuccessMessage"
                defaultValue={
                  getContactFormSettings(settings).successMessage ??
                  getDefaultContactFormConfig().successMessage
                }
                className="w-full rounded-md border border-[#e9ebec] px-3 py-2 text-sm outline-none focus:border-[#405189]"
              />
            </div>
          </div>

          <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            İletişim bilgileri (e-posta, telefon, adres) ayrı bir bölümdür. Grid
            kolonuna <strong>İletişim bilgileri</strong> ekleyerek formun yanına
            yerleştirin.
          </p>

          <ContactFormFieldsEditor
            initialFields={getContactFormSettings(settings).fields}
          />
        </>
      ) : null}

      {section.type === "CONTACT_INFO" ? (
        <>
          <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            Gösterilecek değerler <strong>Genel Ayarlar → İletişim</strong>{" "}
            alanlarından alınır. Buradan yalnızca hangi alanların görüneceğini
            seçersiniz.
          </p>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Kısa açıklama
            </label>
            <input
              name="contactInfoIntroText"
              defaultValue={
                getContactInfoBlockSettings(settings).introText ??
                getDefaultContactInfoBlockConfig().introText
              }
              className="w-full rounded-md border border-[#e9ebec] px-3 py-2 text-sm outline-none focus:border-[#405189]"
            />
          </div>

          <AdminSwitch
            name="contactInfoShowEmail"
            label="E-posta"
            defaultChecked={getContactInfoBlockSettings(settings).showEmail}
          />
          <AdminSwitch
            name="contactInfoShowPhone"
            label="Telefon"
            defaultChecked={getContactInfoBlockSettings(settings).showPhone}
          />
          <AdminSwitch
            name="contactInfoShowWhatsapp"
            label="WhatsApp"
            defaultChecked={getContactInfoBlockSettings(settings).showWhatsapp}
          />
          <AdminSwitch
            name="contactInfoShowAddress"
            label="Adres"
            defaultChecked={getContactInfoBlockSettings(settings).showAddress}
          />
          <AdminSwitch
            name="contactInfoShowWorkingHours"
            label="Çalışma saatleri"
            defaultChecked={getContactInfoBlockSettings(settings).showWorkingHours}
          />
          <AdminSwitch
            name="contactInfoShowMap"
            label="Harita"
            description="Genel Ayarlar’daki harita gömme kodunu gösterir."
            defaultChecked={getContactInfoBlockSettings(settings).showMap}
          />
        </>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center gap-2 rounded-md bg-[#405189] px-3 py-2 text-sm font-semibold text-white hover:bg-[#364574] disabled:opacity-60"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        Bölümü kaydet
      </button>
    </form>
  );
}

function SortableSectionCard({
  pageId,
  section,
  childSections,
  open,
  openChildId,
  pending,
  options,
  onToggleOpen,
  onOpenChild,
  onToggleActive,
  onDelete,
}: {
  pageId: string;
  section: BuilderSection;
  childSections: BuilderSection[];
  open: boolean;
  openChildId: string | null;
  pending: boolean;
  options: BuilderOptions;
  onToggleOpen: () => void;
  onOpenChild: (id: string) => void;
  onToggleActive: () => void;
  onDelete: () => void;
}) {
  const meta = getPageSectionTypeMeta(section.type);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border bg-white shadow-sm ${
        section.isActive ? "border-[#e9ebec]" : "border-amber-200 opacity-80"
      } ${isDragging ? "z-10 opacity-60 shadow-lg ring-2 ring-[#405189]/30" : ""}`}
    >
      <div className="flex flex-wrap items-center gap-2 px-4 py-3">
        <button
          type="button"
          className="inline-flex h-8 w-8 shrink-0 cursor-grab items-center justify-center rounded-md border border-[#e9ebec] text-slate-400 hover:bg-slate-50 hover:text-slate-600 active:cursor-grabbing"
          title="Sürükleyerek taşı"
          disabled={pending}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={onToggleOpen}
          className="min-w-0 flex-1 text-left"
        >
          <p className="text-sm font-semibold text-slate-800">
            {section.label || meta.defaultLabel}
          </p>
          <p className="text-xs text-slate-500">
            {meta.label}
            {!section.isActive ? " · gizli" : ""}
          </p>
        </button>

        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={pending}
            onClick={onToggleActive}
            className="rounded-md border border-[#e9ebec] p-1.5 text-slate-600 hover:bg-slate-50"
            title={section.isActive ? "Gizle" : "Göster"}
          >
            {section.isActive ? (
              <Eye className="h-4 w-4" />
            ) : (
              <EyeOff className="h-4 w-4" />
            )}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={onDelete}
            className="rounded-md border border-red-200 p-1.5 text-red-600 hover:bg-red-50"
            title="Sil"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {open ? (
        <div className="px-4 pb-4">
          {section.type === "GRID_ROW" ? (
            <GridRowEditor
              pageId={pageId}
              section={section}
              childSections={childSections}
              openChildId={openChildId}
              onOpenChild={onOpenChild}
              onChildDeleted={(id) => {
                if (openChildId === id) onOpenChild(id);
              }}
              renderChild={(child) => {
                const full = childSections.find((item) => item.id === child.id);
                if (!full || openChildId !== child.id) return null;
                return (
                  <SectionEditor section={full} hideHeaderFields {...options} />
                );
              }}
            />
          ) : (
            <SectionEditor section={section} {...options} />
          )}
        </div>
      ) : null}
    </div>
  );
}

export function PageBuilder(props: PageBuilderProps) {
  const { pageId, sections, ...options } = props;
  const router = useRouter();
  const [items, setItems] = useState(() =>
    sections.filter((section) => !section.parentId),
  );
  const [openId, setOpenId] = useState<string | null>(
    sections.find((section) => !section.parentId)?.id ?? null,
  );
  const [openChildId, setOpenChildId] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setItems(sections.filter((section) => !section.parentId));
  }, [sections]);

  const childrenByParent = useMemo(() => {
    const map = new Map<string, BuilderSection[]>();
    for (const section of sections) {
      if (!section.parentId) continue;
      const list = map.get(section.parentId) ?? [];
      list.push(section);
      map.set(section.parentId, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.sortOrder - b.sortOrder);
    }
    return map;
  }, [sections]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const run = (
    fn: () => Promise<{ success?: boolean; error?: string; message?: string }>,
  ) => {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (result.error) setError(result.error);
      else if (result.message) setMessage(result.message);
      router.refresh();
    });
  };

  const onDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const previous = items;
    const next = arrayMove(items, oldIndex, newIndex);
    setItems(next);

    startTransition(async () => {
      setMessage(null);
      setError(null);
      const result = await reorderPageSectionsAction(
        pageId,
        next.map((item) => item.id),
        null,
      );
      if (result.error) {
        setItems(previous);
        setError(result.error);
        return;
      }
      if (result.message) setMessage(result.message);
      router.refresh();
    });
  };

  const activeItem = activeId
    ? items.find((item) => item.id === activeId) ?? null
    : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Sayfa builder</h2>
          <p className="text-sm text-slate-500">
            Bölüm ekleyin, içeriğini seçin; sol tutamacı sürükleyerek sırayı
            değiştirin.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowPicker((value) => !value)}
          className="inline-flex items-center gap-2 rounded-md bg-[#405189] px-3 py-2 text-sm font-semibold text-white hover:bg-[#364574]"
        >
          <Plus className="h-4 w-4" />
          Bölüm ekle
        </button>
      </div>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {message}
        </p>
      ) : null}

      {showPicker ? (
        <div className="grid gap-3 rounded-lg border border-[#e9ebec] bg-[#f8f9fb] p-4 sm:grid-cols-2 lg:grid-cols-3">
          {PAGE_SECTION_TYPE_META.map((item) => (
            <button
              key={item.type}
              type="button"
              disabled={pending}
              onClick={() =>
                run(async () => {
                  const result = await addPageSectionAction(pageId, item.type);
                  setShowPicker(false);
                  return result;
                })
              }
              className="rounded-lg border border-[#e9ebec] bg-white p-4 text-left transition hover:border-[#405189]/40 hover:shadow-sm disabled:opacity-60"
            >
              <p className="text-sm font-semibold text-slate-800">{item.label}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                {item.description}
              </p>
            </button>
          ))}
        </div>
      ) : null}

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[#e9ebec] bg-white px-5 py-10 text-center">
          <p className="text-sm font-medium text-slate-700">Henüz bölüm yok</p>
          <p className="mt-1 text-sm text-slate-500">
            Hero, kart, proje, blog veya SSS ekleyerek sayfayı oluşturun.
          </p>
        </div>
      ) : (
        <DndContext
          id={`page-builder-${pageId}`}
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragCancel={() => setActiveId(null)}
        >
          <SortableContext
            items={items.map((item) => item.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {items.map((section) => (
                <SortableSectionCard
                  key={section.id}
                  pageId={pageId}
                  section={section}
                  childSections={childrenByParent.get(section.id) ?? []}
                  open={openId === section.id}
                  openChildId={openChildId}
                  pending={pending}
                  options={options}
                  onToggleOpen={() => {
                    setOpenId(openId === section.id ? null : section.id);
                    setOpenChildId(null);
                  }}
                  onOpenChild={(id) =>
                    setOpenChildId((current) => (current === id ? null : id))
                  }
                  onToggleActive={() =>
                    run(() => togglePageSectionActiveAction(section.id))
                  }
                  onDelete={() => {
                    if (
                      !window.confirm(
                        section.type === "GRID_ROW"
                          ? "Bu grid satırını ve içindeki tüm bölümleri silmek istediğinize emin misiniz?"
                          : "Bu bölümü silmek istediğinize emin misiniz?",
                      )
                    ) {
                      return;
                    }
                    run(() => deletePageSectionAction(section.id));
                  }}
                />
              ))}
            </div>
          </SortableContext>
          <DragOverlay>
            {activeItem ? (
              <div className="rounded-lg border border-[#405189] bg-white px-4 py-3 shadow-xl">
                <p className="text-sm font-semibold text-slate-800">
                  {activeItem.label ||
                    getPageSectionTypeMeta(activeItem.type).defaultLabel}
                </p>
                <p className="text-xs text-slate-500">
                  {getPageSectionTypeMeta(activeItem.type).label}
                </p>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}
