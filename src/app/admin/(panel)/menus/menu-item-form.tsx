"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { MenuLinkType } from "@prisma/client";
import { Loader2, Save } from "lucide-react";
import { AdminSwitch } from "@/components/admin/admin-switch";
import { SearchableSelect, type SearchableSelectOption } from "@/components/admin/searchable-select";
import { MENU_LINK_TYPE_LABELS, MENU_LINK_TYPES } from "@/lib/menus";
import {
  createMenuItemAction,
  updateMenuItemAction,
  type MenuFormState,
} from "./actions";

const initialState: MenuFormState = {};

export type MenuLinkOptions = {
  pages: SearchableSelectOption[];
  workCategories: SearchableSelectOption[];
  works: SearchableSelectOption[];
  projectCategories: SearchableSelectOption[];
  projects: SearchableSelectOption[];
  blogCategories: SearchableSelectOption[];
  blogPosts: SearchableSelectOption[];
};

export type MenuItemFormValues = {
  id?: string;
  parentId?: string | null;
  label?: string;
  linkType?: MenuLinkType;
  href?: string | null;
  description?: string | null;
  openInNewTab?: boolean;
  sortOrder?: number;
  isActive?: boolean;
  targetId?: string | null;
};

function targetOptionsFor(
  linkType: MenuLinkType,
  options: MenuLinkOptions,
): SearchableSelectOption[] {
  switch (linkType) {
    case "CUSTOM":
      return [];
    case "PAGE":
      return options.pages;
    case "WORK_CATEGORY":
      return options.workCategories;
    case "WORK":
      return options.works;
    case "PROJECT_CATEGORY":
      return options.projectCategories;
    case "PROJECT":
      return options.projects;
    case "BLOG_CATEGORY":
      return options.blogCategories;
    case "BLOG_POST":
      return options.blogPosts;
    default: {
      const _exhaustive: never = linkType;
      return _exhaustive;
    }
  }
}

export function MenuItemForm({
  mode,
  groupId,
  initial,
  linkOptions,
  parentOptions,
  onSuccess,
  onCancel,
}: {
  mode: "create" | "edit";
  groupId: string;
  initial?: MenuItemFormValues;
  linkOptions: MenuLinkOptions;
  parentOptions: SearchableSelectOption[];
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const action = mode === "create" ? createMenuItemAction : updateMenuItemAction;
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [label, setLabel] = useState(initial?.label ?? "");
  const [linkType, setLinkType] = useState<MenuLinkType>(initial?.linkType ?? "CUSTOM");
  const [targetId, setTargetId] = useState(initial?.targetId ?? "");
  const [parentId, setParentId] = useState(initial?.parentId ?? "");
  const [href, setHref] = useState(initial?.href ?? "");

  const targetOptions = useMemo(
    () => targetOptionsFor(linkType, linkOptions),
    [linkType, linkOptions],
  );

  const filteredParents = useMemo(() => {
    if (!initial?.id) return parentOptions;
    const excluded = new Set<string>([initial.id]);
    // Descendants are filtered on the server; UI still blocks self-selection.
    return parentOptions.filter((option) => !excluded.has(option.id));
  }, [parentOptions, initial?.id]);

  useEffect(() => {
    if (!state.success) return;
    onSuccess?.();
    router.refresh();
  }, [state.success, onSuccess, router]);

  const inputClass =
    "w-full rounded-md border border-[#e9ebec] bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#0ab39c] focus:ring-2 focus:ring-[#0ab39c]/20";

  return (
    <form action={formAction} className="flex max-h-[min(80vh,720px)] flex-col">
      <input type="hidden" name="groupId" value={groupId} />
      {mode === "edit" && initial?.id ? <input type="hidden" name="id" value={initial.id} /> : null}
      <input type="hidden" name="parentId" value={parentId} />
      <input type="hidden" name="linkType" value={linkType} />
      <input type="hidden" name="targetId" value={targetId} />

      <div className="flex-1 overflow-y-auto">
        {state.error ? (
          <div className="mx-5 mt-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {state.error}
          </div>
        ) : null}

        <div className="grid gap-5 p-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <label htmlFor="menu-label" className="mb-1.5 block text-sm font-medium text-slate-700">
              Menü başlığı *
            </label>
            <input
              id="menu-label"
              name="label"
              required
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Örn. Hizmetler"
              className={inputClass}
            />
            {state.fieldErrors?.label ? (
              <p className="mt-1.5 text-xs text-rose-600">{state.fieldErrors.label}</p>
            ) : null}
          </div>

          <div className="md:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Üst menü</label>
            <SearchableSelect
              name="parentIdUi"
              value={parentId}
              onChange={setParentId}
              options={filteredParents}
              placeholder="Kök seviye (üst menü yok)"
              emptyLabel="Kök seviye"
              searchPlaceholder="Üst menü ara…"
            />
            <p className="mt-1.5 text-xs text-slate-400">
              Alt menü / mega menü için bir üst öğe seçin.
            </p>
          </div>

          <div className="md:col-span-2">
            <label htmlFor="linkType" className="mb-1.5 block text-sm font-medium text-slate-700">
              Bağlantı tipi *
            </label>
            <select
              id="linkType"
              value={linkType}
              onChange={(e) => {
                const next = e.target.value as MenuLinkType;
                setLinkType(next);
                setTargetId("");
                if (next !== "CUSTOM") setHref("");
              }}
              className={inputClass}
            >
              {MENU_LINK_TYPES.map((type) => (
                <option key={type} value={type}>
                  {MENU_LINK_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>

          {linkType === "CUSTOM" ? (
            <div className="md:col-span-2">
              <label htmlFor="href" className="mb-1.5 block text-sm font-medium text-slate-700">
                Link URL *
              </label>
              <input
                id="href"
                name="href"
                required
                value={href}
                onChange={(e) => setHref(e.target.value)}
                placeholder="/iletisim veya https://…"
                className={inputClass}
              />
            </div>
          ) : (
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                İçerik seçimi *
              </label>
              <SearchableSelect
                name="targetIdUi"
                value={targetId}
                onChange={(value) => {
                  setTargetId(value);
                  const selected = targetOptions.find((option) => option.id === value);
                  if (selected && !label.trim()) setLabel(selected.label.replace(/^—+\s*/, ""));
                }}
                options={targetOptions}
                placeholder="İçerik seçin…"
                emptyLabel="— Seçim yok —"
                searchPlaceholder="Ara…"
              />
              <div className="mt-3">
                <label htmlFor="href-override" className="mb-1.5 block text-sm font-medium text-slate-700">
                  URL override (opsiyonel)
                </label>
                <input
                  id="href-override"
                  name="href"
                  value={href}
                  onChange={(e) => setHref(e.target.value)}
                  placeholder="Boş bırakılırsa içerikten üretilir"
                  className={inputClass}
                />
              </div>
            </div>
          )}

          <div className="md:col-span-2">
            <label htmlFor="description" className="mb-1.5 block text-sm font-medium text-slate-700">
              Kısa açıklama
            </label>
            <input
              id="description"
              name="description"
              defaultValue={initial?.description ?? ""}
              placeholder="Mega menüde gösterilecek kısa metin (opsiyonel)"
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

          <div className="flex flex-wrap items-end gap-3">
            <AdminSwitch
              name="isActive"
              label="Aktif"
              defaultChecked={initial?.isActive ?? true}
            />
            <AdminSwitch
              name="openInNewTab"
              label="Yeni sekme"
              defaultChecked={initial?.openInNewTab ?? false}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[#e9ebec] bg-[#f3f6f9] px-5 py-3">
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="rounded-md border border-[#e9ebec] bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
          >
            Vazgeç
          </button>
        ) : null}
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-md bg-[#0ab39c] px-5 py-2 text-sm font-semibold text-white hover:bg-[#099885] disabled:opacity-70"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {mode === "create" ? "Ekle" : "Kaydet"}
        </button>
      </div>
    </form>
  );
}
