"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Loader2,
  Pencil,
  Plus,
  Power,
  Trash2,
  X,
} from "lucide-react";
import { stripHtml } from "@/lib/html";
import { deleteFaqItemAction, toggleFaqItemActiveAction } from "./actions";
import { FaqItemForm, type FaqItemFormValues } from "./faq-item-form";

export type FaqItemRow = {
  id: string;
  question: string;
  answer: string;
  isActive: boolean;
  sortOrder: number;
};

type ItemModalState =
  | { mode: "create" }
  | { mode: "edit"; item: FaqItemRow };

function FaqItemModal({
  groupId,
  groupName,
  state,
  onClose,
}: {
  groupId: string;
  groupName: string;
  state: ItemModalState;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const initial: FaqItemFormValues | undefined =
    state.mode === "edit"
      ? {
          id: state.item.id,
          question: state.item.question,
          answer: state.item.answer,
          sortOrder: state.item.sortOrder,
          isActive: state.item.isActive,
        }
      : undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Kapat"
        className="absolute inset-0 bg-slate-900/50"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="faq-item-modal-title"
        className="relative flex w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-[#e9ebec] bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#e9ebec] px-5 py-4">
          <div className="min-w-0">
            <h2 id="faq-item-modal-title" className="text-base font-semibold text-slate-800">
              {state.mode === "create" ? "Yeni Soru" : "Soruyu Düzenle"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">Grup: {groupName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <FaqItemForm
          key={state.mode === "edit" ? state.item.id : "create"}
          mode={state.mode}
          groupId={groupId}
          groupName={groupName}
          initial={initial}
          layout="modal"
          onSuccess={onClose}
          onCancel={onClose}
        />
      </div>
    </div>
  );
}

export function FaqItemsPanel({
  groupId,
  groupName,
  items,
}: {
  groupId: string;
  groupName: string;
  items: FaqItemRow[];
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [modal, setModal] = useState<ItemModalState | null>(null);

  return (
    <>
      <section className="rounded-lg border border-[#e9ebec] bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-[#e9ebec] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-800">Sorular</h2>
            <p className="mt-1 text-sm text-slate-500">
              Bu gruba ait soru ve cevaplar
            </p>
          </div>
          <button
            type="button"
            onClick={() => setModal({ mode: "create" })}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-[#0ab39c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#099885]"
          >
            <Plus className="h-4 w-4" />
            Yeni Soru
          </button>
        </div>

        {items.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-slate-500">
            Bu grupta henüz soru yok.{" "}
            <button
              type="button"
              onClick={() => setModal({ mode: "create" })}
              className="font-medium text-[#0ab39c] hover:underline"
            >
              İlk soruyu ekleyin
            </button>
            .
          </div>
        ) : (
          <div className="divide-y divide-[#e9ebec]">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-800">{item.question}</p>
                  <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">
                    {stripHtml(item.answer)} · sıra {item.sortOrder}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {item.isActive ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-600">
                      <Check className="h-3.5 w-3.5" />
                      Aktif
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-600">
                      <X className="h-3.5 w-3.5" />
                      Pasif
                    </span>
                  )}
                  <form action={toggleFaqItemActiveAction}>
                    <input type="hidden" name="id" value={item.id} />
                    <button
                      type="submit"
                      title={item.isActive ? "Pasife al" : "Aktif et"}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#e9ebec] text-slate-500 hover:text-[#0ab39c]"
                    >
                      <Power className="h-4 w-4" />
                    </button>
                  </form>
                  <button
                    type="button"
                    title="Düzenle"
                    onClick={() => setModal({ mode: "edit", item })}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#e9ebec] text-slate-500 hover:text-[#405189]"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={isPending && pendingId === item.id}
                    onClick={() => {
                      if (!confirm("Bu soru silinsin mi?")) return;
                      const formData = new FormData();
                      formData.set("id", item.id);
                      setPendingId(item.id);
                      startTransition(async () => {
                        await deleteFaqItemAction(formData);
                        setPendingId(null);
                        router.refresh();
                      });
                    }}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-rose-200 text-rose-500 hover:bg-rose-50 disabled:opacity-60"
                  >
                    {isPending && pendingId === item.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {modal ? (
        <FaqItemModal
          groupId={groupId}
          groupName={groupName}
          state={modal}
          onClose={() => setModal(null)}
        />
      ) : null}
    </>
  );
}
