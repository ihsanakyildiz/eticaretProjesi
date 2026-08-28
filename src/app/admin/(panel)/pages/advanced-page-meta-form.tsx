"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { AdminSwitch } from "@/components/admin/admin-switch";
import { SEO_DESCRIPTION_MAX, SEO_TITLE_MAX, clampSeoText } from "@/lib/seo";
import {
  createAdvancedPageAction,
  updateAdvancedPageMetaAction,
  type PageFormState,
} from "./actions";

const initialState: PageFormState = {};

type AdvancedPageMetaFormProps = {
  mode: "create" | "edit";
  initial?: {
    id?: string;
    title?: string;
    slug?: string;
    sortOrder?: number;
    isActive?: boolean;
    sidebarEnabled?: boolean;
    seoTitle?: string;
    seoDescription?: string;
  };
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

export function AdvancedPageMetaForm({ mode, initial }: AdvancedPageMetaFormProps) {
  const router = useRouter();
  const action =
    mode === "create" ? createAdvancedPageAction : updateAdvancedPageMetaAction;
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(initial?.slug));
  const [seoTitle, setSeoTitle] = useState(() =>
    clampSeoText(initial?.seoTitle ?? "", SEO_TITLE_MAX),
  );
  const [seoDescription, setSeoDescription] = useState(() =>
    clampSeoText(initial?.seoDescription ?? "", SEO_DESCRIPTION_MAX),
  );

  useEffect(() => {
    if (!state.success) return;
    if (mode === "create" && "pageId" in state && state.pageId) {
      router.push(`/admin/pages/${state.pageId}/edit`);
      router.refresh();
      return;
    }
    router.refresh();
  }, [state, mode, router]);

  return (
    <form action={formAction} className="space-y-5">
      {initial?.id ? <input type="hidden" name="id" value={initial.id} /> : null}

      {state.error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
      {state.success && state.message ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {state.message}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Başlık
          </label>
          <input
            name="title"
            value={title}
            onChange={(event) => {
              const next = event.target.value;
              setTitle(next);
              if (!slugTouched) setSlug(slugPreview(next));
            }}
            required
            className="w-full rounded-md border border-[#e9ebec] px-3 py-2 text-sm outline-none focus:border-[#0ab39c] focus:ring-1 focus:ring-[#0ab39c]"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Slug
          </label>
          <input
            name="slug"
            value={slug}
            onChange={(event) => {
              setSlugTouched(true);
              setSlug(slugPreview(event.target.value));
            }}
            className="w-full rounded-md border border-[#e9ebec] px-3 py-2 text-sm outline-none focus:border-[#0ab39c] focus:ring-1 focus:ring-[#0ab39c]"
            placeholder="ornek-sayfa"
          />
          <p className="mt-1 text-xs text-slate-400">
            Ön yüz: /{slug || "ornek-sayfa"} — anasayfa için slug{" "}
            <code className="rounded bg-slate-100 px-1">anasayfa</code> kullanın.
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Sıra
          </label>
          <input
            type="number"
            name="sortOrder"
            defaultValue={initial?.sortOrder ?? ""}
            className="w-full rounded-md border border-[#e9ebec] px-3 py-2 text-sm outline-none focus:border-[#0ab39c] focus:ring-1 focus:ring-[#0ab39c]"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            SEO başlığı
          </label>
          <input
            name="seoTitle"
            value={seoTitle}
            onChange={(event) =>
              setSeoTitle(clampSeoText(event.target.value, SEO_TITLE_MAX))
            }
            maxLength={SEO_TITLE_MAX}
            className="w-full rounded-md border border-[#e9ebec] px-3 py-2 text-sm outline-none focus:border-[#0ab39c] focus:ring-1 focus:ring-[#0ab39c]"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            SEO açıklaması
          </label>
          <textarea
            name="seoDescription"
            value={seoDescription}
            onChange={(event) =>
              setSeoDescription(
                clampSeoText(event.target.value, SEO_DESCRIPTION_MAX),
              )
            }
            maxLength={SEO_DESCRIPTION_MAX}
            rows={3}
            className="w-full rounded-md border border-[#e9ebec] px-3 py-2 text-sm outline-none focus:border-[#0ab39c] focus:ring-1 focus:ring-[#0ab39c]"
          />
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:gap-8">
        <AdminSwitch
          name="isActive"
          label="Yayında"
          defaultChecked={initial?.isActive ?? true}
        />
        <AdminSwitch
          name="sidebarEnabled"
          label="Sidebar göster"
          description="Bu sayfada site kenar çubuğunu göster"
          defaultChecked={initial?.sidebarEnabled ?? true}
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center gap-2 rounded-md bg-[#0ab39c] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#099885] disabled:opacity-60"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        {mode === "create" ? "Oluştur ve builder’a geç" : "Sayfa bilgilerini kaydet"}
      </button>
    </form>
  );
}
