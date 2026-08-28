"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { AdminSwitch } from "@/components/admin/admin-switch";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import {
  createFaqItemAction,
  updateFaqItemAction,
  type FaqFormState,
} from "./actions";

const initialState: FaqFormState = {};

export type FaqItemFormValues = {
  id?: string;
  question?: string;
  answer?: string;
  sortOrder?: number;
  isActive?: boolean;
};

export function FaqItemForm({
  mode,
  groupId,
  groupName,
  initial,
  layout = "page",
  onSuccess,
  onCancel,
}: {
  mode: "create" | "edit";
  groupId: string;
  groupName: string;
  initial?: FaqItemFormValues;
  layout?: "page" | "modal";
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const action = mode === "create" ? createFaqItemAction : updateFaqItemAction;
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [question, setQuestion] = useState(initial?.question ?? "");

  useEffect(() => {
    if (!state.success) return;
    if (onSuccess) {
      onSuccess();
      router.refresh();
      return;
    }
    const redirectGroupId = state.fieldErrors?.redirectGroupId ?? groupId;
    router.push(`/admin/faqs/${redirectGroupId}/edit`);
    router.refresh();
  }, [state.success, state.fieldErrors, groupId, router, onSuccess]);

  const inputClass =
    "w-full rounded-md border border-[#e9ebec] bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#0ab39c] focus:ring-2 focus:ring-[#0ab39c]/20";

  const fields = (
    <div className="grid gap-5 p-5 md:grid-cols-2">
      <div className="md:col-span-2">
        <label htmlFor="faq-question" className="mb-1.5 block text-sm font-medium text-slate-700">
          Soru *
        </label>
        <input
          id="faq-question"
          name="question"
          required
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Örn. Proje süreci nasıl işliyor?"
          className={inputClass}
        />
        {state.fieldErrors?.question ? (
          <p className="mt-1.5 text-xs text-rose-600">{state.fieldErrors.question}</p>
        ) : null}
      </div>

      <div className="md:col-span-2">
        <label htmlFor="faq-answer" className="mb-1.5 block text-sm font-medium text-slate-700">
          Cevap *
        </label>
        <RichTextEditor
          id="faq-answer"
          name="answer"
          variant="compact"
          value={initial?.answer ?? ""}
          placeholder="Cevabı buraya yazın…"
        />
        {state.fieldErrors?.answer ? (
          <p className="mt-1.5 text-xs text-rose-600">{state.fieldErrors.answer}</p>
        ) : null}
      </div>

      <div>
        <label htmlFor="faq-sortOrder" className="mb-1.5 block text-sm font-medium text-slate-700">
          Sıra
        </label>
        <input
          id="faq-sortOrder"
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

      <div className="flex items-end">
        <AdminSwitch
          name="isActive"
          label="Aktif"
          defaultChecked={initial?.isActive ?? true}
        />
      </div>
    </div>
  );

  if (layout === "modal") {
    return (
      <form action={formAction} className="flex max-h-[min(85vh,720px)] flex-col">
        <input type="hidden" name="groupId" value={groupId} />
        {mode === "edit" && initial?.id ? <input type="hidden" name="id" value={initial.id} /> : null}

        <div className="admin-scroll-light min-h-0 flex-1 overflow-y-auto">
          {state.error ? (
            <div className="mx-5 mt-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {state.error}
            </div>
          ) : null}
          {fields}
        </div>

        <div className="flex justify-end gap-2 border-t border-[#e9ebec] bg-[#f3f6f9] px-5 py-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="rounded-md border border-[#e9ebec] bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
          >
            Vazgeç
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-md bg-[#0ab39c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#099885] disabled:opacity-70"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {mode === "create" ? "Soruyu Kaydet" : "Güncelle"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="groupId" value={groupId} />
      {mode === "edit" && initial?.id ? <input type="hidden" name="id" value={initial.id} /> : null}

      {state.error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {state.error}
        </div>
      ) : null}

      <section className="rounded-lg border border-[#e9ebec] bg-white shadow-sm">
        <div className="border-b border-[#e9ebec] px-5 py-4">
          <h2 className="text-base font-semibold text-slate-800">Soru & Cevap</h2>
          <p className="mt-1 text-sm text-slate-500">Grup: {groupName}</p>
        </div>
        {fields}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/admin/faqs/${groupId}/edit`}
          className="rounded-md border border-[#e9ebec] px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Gruba Dön
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-md bg-[#0ab39c] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#099885] disabled:opacity-70"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {mode === "create" ? "Soruyu Kaydet" : "Değişiklikleri Kaydet"}
        </button>
      </div>
    </form>
  );
}
