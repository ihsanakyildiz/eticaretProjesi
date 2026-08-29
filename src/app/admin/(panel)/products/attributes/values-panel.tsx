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
import { Check, GripVertical, Pencil, Plus, Power, Trash2, X } from "lucide-react";
import type { ProductAttributeDisplayTypeValue } from "@/lib/product-attributes";
import {
  deleteProductAttributeValueAction,
  reorderProductAttributeValuesAction,
  toggleProductAttributeValueActiveAction,
} from "./actions";
import {
  ProductAttributeValueForm,
  type AttributeValueFormValues,
} from "./value-form";

export type AttributeValueRow = {
  id: string;
  name: string;
  slug: string;
  colorHex: string | null;
  image: string | null;
  isActive: boolean;
  sortOrder: number;
};

type ValueModalState =
  | { mode: "create" }
  | { mode: "edit"; item: AttributeValueRow };

function ValueSwatch({
  displayType,
  value,
}: {
  displayType: ProductAttributeDisplayTypeValue;
  value: AttributeValueRow;
}) {
  switch (displayType) {
    case "COLOR":
      return (
        <span
          className="inline-block h-6 w-6 shrink-0 rounded-full border border-[#e9ebec]"
          style={{ backgroundColor: value.colorHex || "#e2e8f0" }}
          title={value.colorHex ?? undefined}
        />
      );
    case "IMAGE":
      return (
        <span className="inline-flex h-8 w-8 shrink-0 overflow-hidden rounded-md border border-[#e9ebec] bg-[#f3f6f9]">
          {value.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value.image} alt="" className="h-full w-full object-cover" />
          ) : null}
        </span>
      );
    case "TEXT":
      return null;
    default: {
      const _exhaustive: never = displayType;
      return _exhaustive;
    }
  }
}

function SortableValueRow({
  value,
  displayType,
  isPending,
  onToggleActive,
  onEdit,
  onDelete,
}: {
  value: AttributeValueRow;
  displayType: ProductAttributeDisplayTypeValue;
  isPending: boolean;
  onToggleActive: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: value.id });

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={`flex items-center gap-3 border-b border-[#e9ebec] px-5 py-3 last:border-0 ${
        isDragging ? "relative z-10 bg-white opacity-70" : "bg-white"
      }`}
    >
      <button
        type="button"
        className="inline-flex h-8 w-8 shrink-0 cursor-grab items-center justify-center rounded-md border border-[#e9ebec] text-slate-400 active:cursor-grabbing"
        title="Sürükleyerek sırala"
        aria-label={`${value.name} sırasını değiştir`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <ValueSwatch displayType={displayType} value={value} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-slate-800">{value.name}</p>
        <p className="font-mono text-xs text-slate-400">{value.slug}</p>
      </div>
      {value.isActive ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600">
          <Check className="h-3 w-3" />
          Aktif
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-600">
          <X className="h-3 w-3" />
          Pasif
        </span>
      )}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          title={value.isActive ? "Pasife al" : "Aktif et"}
          disabled={isPending}
          onClick={onToggleActive}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#e9ebec] text-slate-500 hover:bg-slate-50"
        >
          <Power className="h-4 w-4" />
        </button>
        <button
          type="button"
          title="Düzenle"
          onClick={onEdit}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#e9ebec] text-slate-500 hover:bg-slate-50"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          title="Sil"
          disabled={isPending}
          onClick={onDelete}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-rose-200 text-rose-500 hover:bg-rose-50"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
}

export function ProductAttributeValuesPanel({
  attributeId,
  attributeName,
  displayType,
  values,
}: {
  attributeId: string;
  attributeName: string;
  displayType: ProductAttributeDisplayTypeValue;
  values: AttributeValueRow[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(values);
  const [modal, setModal] = useState<ValueModalState | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  useEffect(() => {
    setItems(values);
  }, [values]);

  useEffect(() => {
    if (!modal) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setModal(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [modal]);

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

    const previous = items;
    const next = arrayMove(items, oldIndex, newIndex).map((item, index) => ({
      ...item,
      sortOrder: index,
    }));
    setItems(next);

    startTransition(async () => {
      const result = await reorderProductAttributeValuesAction(
        attributeId,
        next.map((item) => item.id),
      );
      if (result.error) {
        setItems(previous);
        setActionError(result.error);
        return;
      }
      setActionError(null);
      router.refresh();
    });
  };

  return (
    <>
      <section className="overflow-hidden rounded-lg border border-[#e9ebec] bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e9ebec] px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-800">Değerler</h2>
            <p className="mt-1 text-sm text-slate-500">
              {attributeName} seçenekleri. Sol tutamacı sürükleyerek sırayı değiştirin.
              Stok her değer için değil; ürün varyantı (SKU) için tanımlanır.
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

        {actionError ? (
          <p className="px-5 py-2 text-sm text-rose-600">{actionError}</p>
        ) : null}

        {items.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-500">
            Henüz değer yok. Örn. 41, 42 veya Siyah, Beyaz.
          </p>
        ) : (
          <DndContext
            id={`attribute-values-${attributeId}`}
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
          >
            <SortableContext
              items={items.map((item) => item.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul>
                {items.map((value) => (
                  <SortableValueRow
                    key={value.id}
                    value={value}
                    displayType={displayType}
                    isPending={isPending}
                    onToggleActive={() =>
                      startTransition(async () => {
                        await toggleProductAttributeValueActiveAction(value.id);
                        router.refresh();
                      })
                    }
                    onEdit={() => setModal({ mode: "edit", item: value })}
                    onDelete={() =>
                      startTransition(async () => {
                        setActionError(null);
                        const result = await deleteProductAttributeValueAction({
                          id: value.id,
                        });
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
            <ProductAttributeValueForm
              key={modal.mode === "edit" ? modal.item.id : "create"}
              mode={modal.mode}
              attributeId={attributeId}
              displayType={displayType}
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
                    } satisfies AttributeValueFormValues)
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
