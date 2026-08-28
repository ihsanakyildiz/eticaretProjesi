"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText,
  FolderKanban,
  ImageIcon,
  Loader2,
  Mail,
  Plus,
  Save,
  Tags,
  Trash2,
} from "lucide-react";
import { AdminSwitch } from "@/components/admin/admin-switch";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import {
  getSidebarWidgetTypeLabel,
  SIDEBAR_WIDGET_TYPES,
  type SidebarWidgetSettings,
} from "@/config/site-sidebars";
import {
  createSidebarWidgetAction,
  deleteSidebarWidgetAction,
  updateSidebarWidgetAction,
  type SidebarFormState,
} from "./actions";

export type SidebarWidgetRow = {
  id: string;
  type: string;
  title: string | null;
  content: string | null;
  imagePath: string | null;
  imageAlt: string | null;
  isActive: boolean;
  sortOrder: number;
  settings: SidebarWidgetSettings;
};

const typeIcon = {
  BLOG_CATEGORIES: Tags,
  WORK_CATEGORIES: FolderKanban,
  PROJECT_CATEGORIES: FolderKanban,
  CONTACT_INFO: Mail,
  RICH_TEXT: FileText,
  IMAGE: ImageIcon,
} as const;

const emptyState: SidebarFormState = {};

function WidgetFields({
  type,
  initial,
  content,
  onContentChange,
}: {
  type: string;
  initial?: SidebarWidgetRow;
  content: string;
  onContentChange: (value: string) => void;
}) {
  const settings = initial?.settings;
  const inputClass =
    "w-full rounded-md border border-[#e9ebec] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#0ab39c] focus:ring-2 focus:ring-[#0ab39c]/20";

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          Başlık (opsiyonel)
        </label>
        <input
          name="title"
          defaultValue={initial?.title ?? ""}
          placeholder="Widget başlığı"
          className={inputClass}
        />
      </div>

      {(type === "BLOG_CATEGORIES" ||
        type === "WORK_CATEGORIES" ||
        type === "PROJECT_CATEGORIES") && (
        <div className="flex flex-wrap gap-4">
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              name="showCounts"
              defaultChecked={settings?.showCounts ?? true}
            />
            Yazı / öğe sayılarını göster
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              name="showAllLink"
              defaultChecked={settings?.showAllLink ?? true}
            />
            “Tüm kategoriler” linki
          </label>
        </div>
      )}

      {type === "CONTACT_INFO" ? (
        <div className="space-y-3 rounded-md border border-[#e9ebec] bg-[#f8f9fb] p-4">
          <p className="text-sm font-medium text-slate-700">Gösterilecek alanlar</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {(
              [
                ["contact_showEmail", "E-posta", settings?.contact?.showEmail ?? true],
                ["contact_showPhone", "Telefon", settings?.contact?.showPhone ?? true],
                ["contact_showWhatsapp", "WhatsApp", settings?.contact?.showWhatsapp ?? false],
                ["contact_showAddress", "Adres", settings?.contact?.showAddress ?? true],
                [
                  "contact_showWorkingHours",
                  "Çalışma saatleri",
                  settings?.contact?.showWorkingHours ?? false,
                ],
                ["contact_showMap", "Harita", settings?.contact?.showMap ?? false],
              ] as const
            ).map(([name, label, checked]) => (
              <label key={name} className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" name={name} defaultChecked={checked} />
                {label}
              </label>
            ))}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Giriş metni
            </label>
            <input
              name="contact_introText"
              defaultValue={settings?.contact?.introText ?? ""}
              className={inputClass}
            />
          </div>
        </div>
      ) : null}

      {type === "RICH_TEXT" ? (
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            İçerik *
          </label>
          <RichTextEditor
            name="content"
            value={content}
            onChange={onContentChange}
          />
        </div>
      ) : null}

      {type === "IMAGE" ? (
        <div className="space-y-3">
          {initial?.imagePath ? (
            <div className="overflow-hidden rounded-md border border-[#e9ebec]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={initial.imagePath}
                alt={initial.imageAlt || ""}
                className="max-h-48 w-full object-cover"
              />
            </div>
          ) : null}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Görsel {initial?.imagePath ? "(değiştir)" : "*"}
            </label>
            <input
              type="file"
              name="image"
              accept="image/*"
              className="block w-full text-sm text-slate-600"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Alt metin
            </label>
            <input
              name="imageAlt"
              defaultValue={initial?.imageAlt ?? ""}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Tıklanınca gidilecek URL
            </label>
            <input
              name="imageLinkUrl"
              defaultValue={settings?.imageLinkUrl ?? ""}
              placeholder="https://…"
              className={inputClass}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CreateWidgetForm({ sidebarId }: { sidebarId: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    createSidebarWidgetAction,
    emptyState,
  );
  const [type, setType] = useState<string>("BLOG_CATEGORIES");
  const [content, setContent] = useState("");

  useEffect(() => {
    if (state.success) {
      setContent("");
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <form action={action} className="space-y-4 rounded-lg border border-dashed border-[#cfd4da] bg-[#fafbfc] p-4">
      <input type="hidden" name="sidebarId" value={sidebarId} />
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
        <Plus className="h-4 w-4 text-[#0ab39c]" />
        Yeni widget ekle
      </div>
      {state.error ? (
        <p className="text-sm text-rose-600">{state.error}</p>
      ) : null}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">Tür</label>
        <select
          name="type"
          value={type}
          onChange={(event) => setType(event.target.value)}
          className="w-full rounded-md border border-[#e9ebec] bg-white px-3 py-2.5 text-sm"
        >
          {SIDEBAR_WIDGET_TYPES.map((item) => (
            <option key={item.key} value={item.key}>
              {item.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-slate-400">
          {SIDEBAR_WIDGET_TYPES.find((item) => item.key === type)?.description}
        </p>
      </div>
      <WidgetFields
        type={type}
        content={content}
        onContentChange={setContent}
      />
      <AdminSwitch name="isActive" label="Aktif" defaultChecked />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-md bg-[#405189] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#364574] disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        Widget ekle
      </button>
    </form>
  );
}

function EditWidgetCard({ widget }: { widget: SidebarWidgetRow }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    updateSidebarWidgetAction,
    emptyState,
  );
  const [content, setContent] = useState(widget.content ?? "");
  const [deleting, setDeleting] = useState(false);
  const Icon = typeIcon[widget.type as keyof typeof typeIcon] ?? FileText;

  useEffect(() => {
    if (state.success) router.refresh();
  }, [state.success, router]);

  const remove = async () => {
    if (!window.confirm("Bu widget silinsin mi?")) return;
    setDeleting(true);
    await deleteSidebarWidgetAction(widget.id);
    router.refresh();
    setDeleting(false);
  };

  return (
    <form
      action={action}
      className="space-y-4 rounded-lg border border-[#e9ebec] bg-white p-4 shadow-sm"
    >
      <input type="hidden" name="id" value={widget.id} />
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[#405189]/10 text-[#405189]">
            <Icon className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-800">
              {widget.title || getSidebarWidgetTypeLabel(widget.type as never)}
            </p>
            <p className="text-xs text-slate-400">
              {getSidebarWidgetTypeLabel(widget.type as never)}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void remove()}
          disabled={deleting}
          className="rounded-md p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      {state.error ? (
        <p className="text-sm text-rose-600">{state.error}</p>
      ) : null}
      <WidgetFields
        type={widget.type}
        initial={widget}
        content={content}
        onContentChange={setContent}
      />
      <div className="flex flex-wrap items-center gap-4">
        <label className="text-sm text-slate-700">
          Sıra{" "}
          <input
            type="number"
            name="sortOrder"
            defaultValue={widget.sortOrder}
            className="ml-2 w-20 rounded-md border border-[#e9ebec] px-2 py-1.5 text-sm"
          />
        </label>
        <AdminSwitch name="isActive" label="Aktif" defaultChecked={widget.isActive} />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-md border border-[#e9ebec] px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Kaydet
      </button>
    </form>
  );
}

export function SidebarWidgetsPanel({
  sidebarId,
  widgets,
}: {
  sidebarId: string;
  widgets: SidebarWidgetRow[];
}) {
  return (
    <section className="space-y-4">
      <div className="rounded-lg border border-[#e9ebec] bg-white px-5 py-4 shadow-sm">
        <h2 className="text-base font-semibold text-slate-800">Widget’lar</h2>
        <p className="mt-1 text-sm text-slate-500">
          Kategori listeleri, iletişim bilgileri, zengin metin veya görsel ekleyin.
        </p>
      </div>

      {widgets.length === 0 ? (
        <p className="text-sm text-slate-500">Henüz widget yok.</p>
      ) : (
        <div className="space-y-4">
          {widgets.map((widget) => (
            <EditWidgetCard key={widget.id} widget={widget} />
          ))}
        </div>
      )}

      <CreateWidgetForm sidebarId={sidebarId} />

      <p className="text-xs text-slate-400">
        <Link href="/admin/sidebars" className="text-[#405189] hover:underline">
          Tüm sidebar’lar
        </Link>
      </p>
    </section>
  );
}
