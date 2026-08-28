"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import {
  updatePageSectionHeaderAction,
  type SectionFormState,
} from "@/app/admin/(panel)/pages/actions";
import {
  getPageSectionTypeMeta,
  sectionSupportsEyebrow,
  type PageSectionTypeValue,
} from "@/lib/page-sections";

const initialState: SectionFormState = {};

type SectionHeaderFormProps = {
  sectionId: string;
  type: PageSectionTypeValue;
  label?: string | null;
  title?: string | null;
  subtitle?: string | null;
  eyebrow?: string | null;
  anchorId?: string | null;
  /** Grid satırı için admin etiketi ve anchor göster */
  showAdminFields?: boolean;
  compact?: boolean;
};

export function SectionHeaderForm({
  sectionId,
  type,
  label,
  title,
  subtitle,
  eyebrow,
  anchorId,
  showAdminFields = false,
  compact = false,
}: SectionHeaderFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    updatePageSectionHeaderAction,
    initialState,
  );
  const meta = getPageSectionTypeMeta(type);
  const supportsEyebrow = sectionSupportsEyebrow(type);

  useEffect(() => {
    if (state.success) router.refresh();
  }, [state.success, router]);

  return (
    <form
      action={formAction}
      className={`rounded-lg border border-[#e9ebec] bg-white ${
        compact ? "space-y-2 p-3" : "space-y-3 p-4"
      }`}
    >
      <input type="hidden" name="sectionId" value={sectionId} />

      {state.error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-2 py-1.5 text-[11px] text-red-700">
          {state.error}
        </p>
      ) : null}
      {state.success && state.message ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-[11px] text-emerald-700">
          {state.message}
        </p>
      ) : null}

      <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
        {compact ? "Başlık alanları" : "Grid başlığı (site)"}
      </p>
      <p className="text-[11px] text-slate-400">
        Boş bırakılan alanlar sitede görünmez.
      </p>

      <div className={`grid gap-2 ${compact ? "" : "sm:grid-cols-2"}`}>
        {showAdminFields ? (
          <>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-slate-600">
                Admin etiketi
              </label>
              <input
                name="label"
                defaultValue={label ?? meta.defaultLabel}
                className="w-full rounded-md border border-[#e9ebec] px-2.5 py-1.5 text-sm outline-none focus:border-[#405189]"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-slate-600">
                Anchor / id (opsiyonel)
              </label>
              <input
                name="anchorId"
                defaultValue={anchorId ?? ""}
                placeholder="ornek: iletisim"
                className="w-full rounded-md border border-[#e9ebec] px-2.5 py-1.5 text-sm outline-none focus:border-[#405189]"
              />
            </div>
          </>
        ) : null}

        {supportsEyebrow ? (
          <div className={showAdminFields ? "sm:col-span-2" : undefined}>
            <label className="mb-1 block text-[11px] font-medium text-slate-600">
              Üst etiket / rozet
            </label>
            <input
              name="eyebrow"
              defaultValue={eyebrow ?? ""}
              placeholder="İletişim"
              className="w-full rounded-md border border-[#e9ebec] px-2.5 py-1.5 text-sm outline-none focus:border-[#405189]"
            />
          </div>
        ) : null}

        <div>
          <label className="mb-1 block text-[11px] font-medium text-slate-600">
            Bölüm başlığı
          </label>
          <input
            name="title"
            defaultValue={title ?? ""}
            className="w-full rounded-md border border-[#e9ebec] px-2.5 py-1.5 text-sm outline-none focus:border-[#405189]"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-medium text-slate-600">
            Alt başlık
          </label>
          <input
            name="subtitle"
            defaultValue={subtitle ?? ""}
            className="w-full rounded-md border border-[#e9ebec] px-2.5 py-1.5 text-sm outline-none focus:border-[#405189]"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center gap-1.5 rounded-md bg-[#405189] px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-[#364574] disabled:opacity-60"
      >
        {isPending ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Save className="h-3 w-3" />
        )}
        Başlığı kaydet
      </button>
    </form>
  );
}
