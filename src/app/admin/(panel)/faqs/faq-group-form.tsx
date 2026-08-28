"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { AdminSwitch } from "@/components/admin/admin-switch";
import {
  createFaqGroupAction,
  updateFaqGroupAction,
  type FaqFormState,
} from "./actions";

const initialState: FaqFormState = {};

type FaqGroupFormValues = {
  id?: string;
  name?: string;
  slug?: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
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

export function FaqGroupForm({
  mode,
  initial,
}: {
  mode: "create" | "edit";
  initial?: FaqGroupFormValues;
}) {
  const router = useRouter();
  const action = mode === "create" ? createFaqGroupAction : updateFaqGroupAction;
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(initial?.slug));

  useEffect(() => {
    if (!state.success) return;
    if (mode === "create" && state.fieldErrors?.redirectId) {
      router.push(`/admin/faqs/${state.fieldErrors.redirectId}/edit`);
      router.refresh();
      return;
    }
    router.push("/admin/faqs");
    router.refresh();
  }, [state.success, state.fieldErrors, mode, router]);

  const inputClass =
    "w-full rounded-md border border-[#e9ebec] bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#0ab39c] focus:ring-2 focus:ring-[#0ab39c]/20";

  return (
    <form action={formAction} className="space-y-6">
      {mode === "edit" && initial?.id ? <input type="hidden" name="id" value={initial.id} /> : null}

      {state.error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {state.error}
        </div>
      ) : null}

      <section className="rounded-lg border border-[#e9ebec] bg-white shadow-sm">
        <div className="border-b border-[#e9ebec] px-5 py-4">
          <h2 className="text-base font-semibold text-slate-800">SSS Grubu</h2>
          <p className="mt-1 text-sm text-slate-500">
            Farklı sayfalarda kullanabileceğiniz soru-cevap koleksiyonu
          </p>
        </div>
        <div className="grid gap-5 p-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-slate-700">
              Grup adı *
            </label>
            <input
              id="name"
              name="name"
              required
              value={name}
              onChange={(e) => {
                const next = e.target.value;
                setName(next);
                if (!slugTouched) setSlug(slugPreview(next));
              }}
              placeholder="Örn. Anasayfa SSS"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="slug" className="mb-1.5 block text-sm font-medium text-slate-700">
              Slug
            </label>
            <input
              id="slug"
              name="slug"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
              placeholder="anasayfa-sss"
              className={inputClass}
            />
            <p className="mt-1.5 text-xs text-slate-400">
              Frontend’de bu slug ile çağrılır.
            </p>
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
          <div className="md:col-span-2">
            <label htmlFor="description" className="mb-1.5 block text-sm font-medium text-slate-700">
              Açıklama
            </label>
            <textarea
              id="description"
              name="description"
              rows={2}
              defaultValue={initial?.description ?? ""}
              placeholder="Admin notu (ziyaretçiye görünmez)"
              className={`${inputClass} resize-y`}
            />
          </div>
          <div className="flex items-end md:col-span-2">
            <AdminSwitch
              name="isActive"
              label="Aktif"
              defaultChecked={initial?.isActive ?? true}
            />
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/faqs"
          className="rounded-md border border-[#e9ebec] px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Listeye Dön
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-md bg-[#0ab39c] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#099885] disabled:opacity-70"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {mode === "create" ? "Grubu Kaydet" : "Değişiklikleri Kaydet"}
        </button>
      </div>
    </form>
  );
}
