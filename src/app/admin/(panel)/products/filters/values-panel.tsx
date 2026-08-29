"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, GripVertical, Pencil, Plus, Power, Trash2 } from "lucide-react";
import type { ProductFilterInputTypeValue } from "@/lib/product-filters";
import {
  deleteProductFilterValueAction,
  reorderProductFilterValuesAction,
  toggleProductFilterValueActiveAction,
} from "./actions";
import {
  ProductFilterValueForm,
  type FilterValueFormValues,
} from "./value-form";

export type FilterValueRow = {
  id: string;
  name: string;
  slug: string;
  colorHex: string | null;
  image: string | null;
  isActive: boolean;
  sortOrder: number;
};

type ValueModalState = { mode: "create" } | { mode: "edit"; item: FilterValueRow };

function ValueSwatch({
  inputType,
  value,
}: {
  inputType: ProductFilterInputTypeValue;
  value: FilterValueRow;
}) {
  switch (inputType) {
    case "SWATCH":
      return value.image ? (
        <span className="inline-flex h-8 w-8 shrink-0 overflow-hidden rounded-md border border-[#e9ebec] bg-[#f3f6f9]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value.image} alt="" className="h-full w-full object-cover" />
        </span>
      ) : (
        <span
          className="inline-block h-6 w-6 shrink-0 rounded-full border border-[#e9ebec]"
          style={{ backgroundColor: value.colorHex || "#e2e8f0" }}
          title={value.colorHex ?? undefined}
        />
      );
    case "MULTI_SELECT":
    case "BOOLEAN":
    case "RANGE":
      return null;
    default: {
      const _exhaustive: never = inputType;
      return _exhaustive;
    }
  }
}

function SortableValueRow({
  value,
  inputType,
  isPending,
  onToggleActive,
  onEdit,
  onDelete,
}: {
  value: FilterValueRow;
  inputType: ProductFilterInputTypeValue;
  isPending: boolean;
  onToggleActive: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: value.id,
  });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-3 border-b border-[#e9ebec] px-4 py-3 last:border-0 ${
        isDragging ? "bg-slate-50" : "bg-white"
      }`}
    >
      <button
        type="button"
        className="cursor-grab text-slate-400 hover:text-slate-600"
        aria-label="Sırala"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <ValueSwatch inputType={inputType} value={value} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-800">{value.name}</p>
        <p className="truncate text-xs text-slate-400">{value.slug}</p>
      </div>
      {value.isActive ? (
        <span className="inline-flex items-center gap-1 rounded-md bg-[#0ab39c]/10 px-2 py-0.5 text-xs font-semibold text-[#0ab39c]">
          <Check className="h-3 w-3" />
          Aktif
        </span>
      ) : (
        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
          Pasif
        </span>
      )}
      <div className="flex gap-1">
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#e9ebec] text-slate-500 hover:text-[#405189]"
          title="Düzenle"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onToggleActive}
          disabled={isPending}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#e9ebec] text-slate-500 hover:text-[#0ab39c] disabled:opacity-60"
          title={value.isActive ? "Pasife al" : "Aktif et"}
        >
          <Power className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={isPending}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#e9ebec] text-slate-500 hover:text-rose-600 disabled:opacity-60"
          title="Sil"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </li>
  );
}

export function ProductFilterValuesPanel({
  filterId,
  filterName,
  inputType,
  values,
}: {
  filterId: string;
  filterName: string;
  inputType: ProductFilterInputTypeValue;
  values: FilterValueRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [items, setItems] = useState(values);
  const [modal, setModal] = useState<ValueModalState | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  useEffect(() => {
    setItems(values);
  }, [values]);

  const closeModal = () => {
    setModal(null);
    router.refresh();
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(items, oldIndex, newIndex);
    setItems(next);
    startTransition(async () => {
      const result = await reorderProductFilterValuesAction({
        filterId,
        orderedIds: next.map((item) => item.id),
      });
      if (result.error) {
        setActionError(result.error);
        setItems(values);
      }
    });
  };

  return (
    <>
      <section className="overflow-hidden rounded-lg border border-[#e9ebec] bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e9ebec] px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-800">Filtre değerleri</h2>
            <p className="mt-1 text-sm text-slate-500">
              {filterName} seçenekleri. Aynı isimde yakın değerler (Pamuk / pamuk) vitrinde ayrı
              kutu üretir; tutarlı adlandırın.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setModal({ mode: "create" })}
            className="inline-flex items-center gap-2 rounded-md bg-[#0ab39c] px-3 py-2 text-sm font-semibold text-white hover:bg-[#099885]"
          >
            <Plus className="h-4 w-4" />
            Değer Ekle
          </button>
        </div>

        {actionError ? <p className="px-5 py-2 text-sm text-rose-600">{actionError}</p> : null}

        {items.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-500">Henüz değer yok.</p>
        ) : (
          <DndContext
            id={`filter-values-${filterId}`}
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
          >
            <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
              <ul>
                {items.map((value) => (
                  <SortableValueRow
                    key={value.id}
                    value={value}
                    inputType={inputType}
                    isPending={isPending}
                    onToggleActive={() =>
                      startTransition(async () => {
                        await toggleProductFilterValueActiveAction({
                          id: value.id,
                          isActive: !value.isActive,
                        });
                        router.refresh();
                      })
                    }
                    onEdit={() => setModal({ mode: "edit", item: value })}
                    onDelete={() =>
                      startTransition(async () => {
                        setActionError(null);
                        const result = await deleteProductFilterValueAction({ id: value.id });
                        if (result.error) {
                          setActionError(result.error);
                          return;
                        }
                        router.refresh();
                      })
                    }
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </section>

      {modal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Kapat"
            className="absolute inset-0 bg-slate-900/50"
            onClick={() => setModal(null)}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-lg overflow-hidden rounded-xl border border-[#e9ebec] bg-white shadow-xl"
          >
            <div className="border-b border-[#e9ebec] px-5 py-4">
              <h2 className="text-base font-semibold text-slate-800">
                {modal.mode === "create" ? "Yeni değer" : "Değeri düzenle"}
              </h2>
            </div>
            <ProductFilterValueForm
              key={modal.mode === "edit" ? modal.item.id : "create"}
              mode={modal.mode}
              filterId={filterId}
              inputType={inputType}
              initial={
                modal.mode === "edit"
                  ? ({
                      id: modal.item.id,
                      name: modal.item.name,
                      slug: modal.item.slug,
                      colorHex: modal.item.colorHex,
                      image: modal.item.image,
                      sortOrder: modal.item.sortOrder,
                      isActive: modal.item.isActive,
                    } satisfies FilterValueFormValues)
                  : undefined
              }
              onSuccess={closeModal}
              onCancel={() => setModal(null)}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
