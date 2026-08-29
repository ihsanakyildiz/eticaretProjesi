"use client";

import { useEffect, useRef, useState, type HTMLAttributes } from "react";
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
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Upload, X } from "lucide-react";

export type ProductGalleryItem = {
  key: string;
  id?: string;
  url?: string;
  preview: string;
  isCover: boolean;
  alt: string;
  file?: File;
};

function GalleryTileShell({
  item,
  onCover,
  onRemove,
  onAltChange,
  dragHandle,
}: {
  item: ProductGalleryItem;
  onCover: () => void;
  onRemove: () => void;
  onAltChange: (alt: string) => void;
  dragHandle?: {
    attributes: HTMLAttributes<HTMLButtonElement>;
    listeners?: HTMLAttributes<HTMLButtonElement>;
  };
}) {
  return (
    <>
      <div className="relative">
        <button
          type="button"
          onClick={onCover}
          className={`h-24 w-28 overflow-hidden rounded-md border ${
            item.isCover ? "border-[#0ab39c] ring-2 ring-[#0ab39c]/30" : "border-[#e9ebec]"
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.preview} alt="" className="h-full w-full object-cover" />
        </button>
        {item.isCover ? (
          <span className="absolute inset-x-1 bottom-1 rounded bg-slate-900/75 px-1 py-0.5 text-center text-[10px] font-semibold text-white">
            Kapak
          </span>
        ) : null}
        {dragHandle ? (
          <button
            type="button"
            className="absolute top-1 left-1 inline-flex h-6 w-6 cursor-grab items-center justify-center rounded bg-white/90 text-slate-500 shadow active:cursor-grabbing"
            title="Sürükleyerek sırala"
            aria-label="Görsel sırasını değiştir"
            {...dragHandle.attributes}
            {...dragHandle.listeners}
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
        ) : null}
        <button
          type="button"
          onClick={onRemove}
          className="absolute -top-2 -right-2 rounded-full bg-white p-1 text-rose-600 shadow"
          aria-label="Görseli kaldır"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <input
        value={item.alt}
        onChange={(event) => onAltChange(event.target.value)}
        placeholder="Alt metin"
        className="mt-1.5 w-full rounded-md border border-[#e9ebec] px-2 py-1 text-xs text-slate-700 outline-none placeholder:text-slate-400 focus:border-[#0ab39c]"
      />
    </>
  );
}

function SortableGalleryTile({
  item,
  onCover,
  onRemove,
  onAltChange,
}: {
  item: ProductGalleryItem;
  onCover: () => void;
  onRemove: () => void;
  onAltChange: (alt: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.key });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={`w-28 ${isDragging ? "relative z-10 opacity-80" : ""}`}
    >
      <GalleryTileShell
        item={item}
        onCover={onCover}
        onRemove={onRemove}
        onAltChange={onAltChange}
        dragHandle={{ attributes, listeners }}
      />
    </div>
  );
}

export function ProductGalleryEditor({
  items,
  onChange,
}: {
  items: ProductGalleryItem[];
  onChange: (items: ProductGalleryItem[]) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dndReady, setDndReady] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  useEffect(() => {
    setDndReady(true);
  }, []);

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((item) => item.key === active.id);
    const newIndex = items.findIndex((item) => item.key === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onChange(arrayMove(items, oldIndex, newIndex));
  };

  const tileHandlers = (item: ProductGalleryItem) => ({
    onCover: () => onChange(items.map((row) => ({ ...row, isCover: row.key === item.key }))),
    onRemove: () => {
      const next = items.filter((row) => row.key !== item.key);
      if (item.isCover && next[0] && !next.some((row) => row.isCover)) {
        next[0] = { ...next[0], isCover: true };
      }
      onChange(next);
    },
    onAltChange: (alt: string) =>
      onChange(items.map((row) => (row.key === item.key ? { ...row, alt } : row))),
  });

  const addButton = (
    <button
      type="button"
      onClick={() => fileRef.current?.click()}
      className="flex h-24 w-28 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-[#e9ebec] text-xs text-slate-500 hover:bg-slate-50"
    >
      <Upload className="h-5 w-5" />
      Görsel ekle
    </button>
  );

  return (
    <div>
      {dndReady ? (
        <DndContext
          id="product-gallery"
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext items={items.map((item) => item.key)} strategy={rectSortingStrategy}>
            <div className="flex flex-wrap gap-3">
              {items.map((item) => (
                <SortableGalleryTile key={item.key} item={item} {...tileHandlers(item)} />
              ))}
              {addButton}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="flex flex-wrap gap-3">
          {items.map((item) => (
            <div key={item.key} className="w-28">
              <GalleryTileShell item={item} {...tileHandlers(item)} />
            </div>
          ))}
          {addButton}
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(event) => {
          const files = [...(event.target.files ?? [])];
          if (!files.length) return;
          const next = [...items];
          for (const file of files) {
            next.push({
              key: `img-${Math.random().toString(36).slice(2, 10)}`,
              preview: URL.createObjectURL(file),
              isCover: next.length === 0,
              alt: "",
              file,
            });
          }
          if (!next.some((item) => item.isCover) && next[0]) next[0].isCover = true;
          onChange(next);
          event.target.value = "";
        }}
      />
      <p className="mt-3 text-xs text-slate-400">
        Sürükleyerek sıralayın. Tıklayınca kapak olur. Alt metin vitrin ve arama için kullanılır.
      </p>
    </div>
  );
}
