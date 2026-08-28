"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { MenuLinkType } from "@prisma/client";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Check,
  GripVertical,
  Loader2,
  Pencil,
  Plus,
  Power,
  Trash2,
  X,
} from "lucide-react";
import { MENU_LINK_TYPE_LABELS } from "@/lib/menus";
import type { SearchableSelectOption } from "@/components/admin/searchable-select";
import {
  deleteMenuItemAction,
  reorderMenuItemsAction,
  toggleMenuItemActiveAction,
  type MenuItemOrderUpdate,
} from "./actions";
import {
  MenuItemForm,
  type MenuItemFormValues,
  type MenuLinkOptions,
} from "./menu-item-form";

export type MenuItemRow = {
  id: string;
  parentId: string | null;
  label: string;
  linkType: MenuLinkType;
  href: string | null;
  description: string | null;
  openInNewTab: boolean;
  isActive: boolean;
  sortOrder: number;
  targetId: string | null;
  linkSummary: string;
};

type DropPosition = "before" | "after" | "inside";

type ItemModalState =
  | { mode: "create"; parentId?: string | null }
  | { mode: "edit"; item: MenuItemRow };

type FlatNode = MenuItemRow & { depth: number };

function buildFlatTree(items: MenuItemRow[]): FlatNode[] {
  const byParent = new Map<string | null, MenuItemRow[]>();
  for (const item of items) {
    const list = byParent.get(item.parentId) ?? [];
    list.push(item);
    byParent.set(item.parentId, list);
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label, "tr"));
  }

  const result: FlatNode[] = [];
  function walk(parentId: string | null, depth: number) {
    for (const item of byParent.get(parentId) ?? []) {
      result.push({ ...item, depth });
      walk(item.id, depth + 1);
    }
  }
  walk(null, 0);
  return result;
}

function collectDescendants(rootId: string, items: MenuItemRow[]): Set<string> {
  const byParent = new Map<string | null, string[]>();
  for (const item of items) {
    const list = byParent.get(item.parentId) ?? [];
    list.push(item.id);
    byParent.set(item.parentId, list);
  }
  const result = new Set<string>();
  const stack = [...(byParent.get(rootId) ?? [])];
  while (stack.length) {
    const id = stack.pop()!;
    if (result.has(id)) continue;
    result.add(id);
    stack.push(...(byParent.get(id) ?? []));
  }
  return result;
}

function applyMove(
  items: MenuItemRow[],
  activeId: string,
  overId: string,
  position: DropPosition,
): MenuItemRow[] | null {
  if (activeId === overId) return null;

  const active = items.find((item) => item.id === activeId);
  const over = items.find((item) => item.id === overId);
  if (!active || !over) return null;

  const descendants = collectDescendants(activeId, items);
  if (descendants.has(overId)) return null;

  let nextParentId: string | null;
  if (position === "inside") {
    nextParentId = over.id;
  } else {
    nextParentId = over.parentId;
  }

  if (nextParentId && (nextParentId === activeId || descendants.has(nextParentId))) {
    return null;
  }

  const working = items.map((item) => ({ ...item }));
  const moved = working.find((item) => item.id === activeId)!;
  moved.parentId = nextParentId;

  const siblings = working
    .filter((item) => item.parentId === nextParentId && item.id !== activeId)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  let insertIndex = siblings.length;
  if (position === "before") {
    insertIndex = siblings.findIndex((item) => item.id === overId);
  } else if (position === "after") {
    insertIndex = siblings.findIndex((item) => item.id === overId) + 1;
  } else {
    insertIndex = siblings.length;
  }
  if (insertIndex < 0) insertIndex = siblings.length;

  siblings.splice(insertIndex, 0, moved);
  siblings.forEach((item, index) => {
    item.sortOrder = index;
  });

  return working;
}

function toOrderUpdates(items: MenuItemRow[]): MenuItemOrderUpdate[] {
  const byParent = new Map<string | null, MenuItemRow[]>();
  for (const item of items) {
    const list = byParent.get(item.parentId) ?? [];
    list.push(item);
    byParent.set(item.parentId, list);
  }

  const updates: MenuItemOrderUpdate[] = [];
  for (const [parentId, list] of byParent) {
    list
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .forEach((item, index) => {
        updates.push({ id: item.id, parentId, sortOrder: index });
      });
  }
  return updates;
}

function MenuItemModal({
  groupId,
  groupName,
  state,
  linkOptions,
  parentOptions,
  onClose,
}: {
  groupId: string;
  groupName: string;
  state: ItemModalState;
  linkOptions: MenuLinkOptions;
  parentOptions: SearchableSelectOption[];
  onClose: () => void;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const initial: MenuItemFormValues | undefined =
    state.mode === "edit"
      ? {
          id: state.item.id,
          parentId: state.item.parentId,
          label: state.item.label,
          linkType: state.item.linkType,
          href: state.item.href,
          description: state.item.description,
          openInNewTab: state.item.openInNewTab,
          sortOrder: state.item.sortOrder,
          isActive: state.item.isActive,
          targetId: state.item.targetId,
        }
      : {
          parentId: state.parentId ?? null,
          linkType: "CUSTOM",
        };

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
        aria-labelledby="menu-item-modal-title"
        className="relative flex w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-[#e9ebec] bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#e9ebec] px-5 py-4">
          <div className="min-w-0">
            <h2 id="menu-item-modal-title" className="text-base font-semibold text-slate-800">
              {state.mode === "create" ? "Yeni Menü Öğesi" : "Menü Öğesini Düzenle"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">Menü: {groupName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <MenuItemForm
          key={
            state.mode === "edit"
              ? state.item.id
              : `create-${state.parentId ?? "root"}`
          }
          mode={state.mode}
          groupId={groupId}
          initial={initial}
          linkOptions={linkOptions}
          parentOptions={parentOptions}
          onSuccess={onClose}
          onCancel={onClose}
        />
      </div>
    </div>
  );
}

function SortableMenuRow({
  item,
  depth,
  dropHint,
  isDragging,
  onEdit,
  onAddChild,
  onDelete,
  deleting,
}: {
  item: FlatNode;
  depth: number;
  dropHint: DropPosition | null;
  isDragging: boolean;
  onEdit: () => void;
  onAddChild: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    marginLeft: depth * 20,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative border-b border-[#e9ebec] last:border-0 ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      {dropHint === "before" ? (
        <div className="absolute inset-x-0 top-0 z-10 h-0.5 bg-[#0ab39c]" />
      ) : null}
      {dropHint === "after" ? (
        <div className="absolute inset-x-0 bottom-0 z-10 h-0.5 bg-[#0ab39c]" />
      ) : null}
      {dropHint === "inside" ? (
        <div className="pointer-events-none absolute inset-0 z-10 rounded-md ring-2 ring-[#0ab39c] ring-inset" />
      ) : null}

      <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-2">
          <button
            type="button"
            className="mt-0.5 inline-flex h-8 w-8 shrink-0 cursor-grab items-center justify-center rounded-md border border-[#e9ebec] text-slate-400 active:cursor-grabbing"
            title="Sürükle"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <p className="truncate font-medium text-slate-800">{item.label}</p>
            <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">
              {MENU_LINK_TYPE_LABELS[item.linkType]} · {item.linkSummary}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 pl-10 sm:pl-0">
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
          <form action={toggleMenuItemActiveAction}>
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
            title="Alt menü ekle"
            onClick={onAddChild}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#e9ebec] text-slate-500 hover:text-[#0ab39c]"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Düzenle"
            onClick={onEdit}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#e9ebec] text-slate-500 hover:text-[#405189]"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={deleting}
            onClick={onDelete}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-rose-200 text-rose-500 hover:bg-rose-50 disabled:opacity-60"
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export function MenuItemsPanel({
  groupId,
  groupName,
  items: initialItems,
  linkOptions,
}: {
  groupId: string;
  groupName: string;
  items: MenuItemRow[];
  linkOptions: MenuLinkOptions;
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [modal, setModal] = useState<ItemModalState | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<DropPosition>("after");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const flat = useMemo(() => buildFlatTree(items), [items]);
  const parentOptions = useMemo<SearchableSelectOption[]>(() => {
    const exclude =
      modal?.mode === "edit"
        ? new Set([modal.item.id, ...collectDescendants(modal.item.id, items)])
        : null;

    return flat
      .filter((item) => !exclude?.has(item.id))
      .map((item) => ({
        id: item.id,
        label: `${"— ".repeat(item.depth)}${item.label}`,
        depth: item.depth,
        searchText: item.label,
      }));
  }, [flat, items, modal]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  const activeItem = activeId ? items.find((item) => item.id === activeId) : null;

  function persistOrder(nextItems: MenuItemRow[]) {
    const updates = toOrderUpdates(nextItems);
    startTransition(async () => {
      const result = await reorderMenuItemsAction(groupId, updates);
      if (result.error) {
        setItems(initialItems);
        return;
      }
      router.refresh();
    });
  }

  function onDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function onDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      setOverId(null);
      return;
    }
    setOverId(String(over.id));

    const overRect = over.rect;
    const translated = active.rect.current.translated;
    if (!overRect || !translated) {
      setDropPosition("after");
      return;
    }

    const pointerY = translated.top + translated.height / 2;
    const relative = (pointerY - overRect.top) / overRect.height;
    if (relative < 0.25) setDropPosition("before");
    else if (relative > 0.75) setDropPosition("after");
    else setDropPosition("inside");
  }

  function onDragEnd(event: DragEndEvent) {
    const currentOverId = overId ?? (event.over ? String(event.over.id) : null);
    const currentActiveId = String(event.active.id);
    const position = dropPosition;

    setActiveId(null);
    setOverId(null);

    if (!currentOverId) return;

    const next = applyMove(items, currentActiveId, currentOverId, position);
    if (!next) return;
    setItems(next);
    persistOrder(next);
  }

  function onDragCancel() {
    setActiveId(null);
    setOverId(null);
  }

  return (
    <>
      <section className="rounded-lg border border-[#e9ebec] bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-[#e9ebec] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-800">Menü Öğeleri</h2>
            <p className="mt-1 text-sm text-slate-500">
              Sürükleyerek sıralayın; ortasına bırakınca alt menü olur. CMS içeriği veya özel
              mega link ekleyin.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setModal({ mode: "create", parentId: null })}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-[#0ab39c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#099885]"
          >
            <Plus className="h-4 w-4" />
            Yeni Öğe
          </button>
        </div>

        {flat.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-slate-500">
            Bu menüde henüz öğe yok.{" "}
            <button
              type="button"
              onClick={() => setModal({ mode: "create", parentId: null })}
              className="font-medium text-[#0ab39c] hover:underline"
            >
              İlk öğeyi ekleyin
            </button>
            .
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragEnd={onDragEnd}
            onDragCancel={onDragCancel}
          >
            <SortableContext items={flat.map((item) => item.id)} strategy={verticalListSortingStrategy}>
              <div>
                {flat.map((item) => (
                  <SortableMenuRow
                    key={item.id}
                    item={item}
                    depth={item.depth}
                    dropHint={overId === item.id && activeId !== item.id ? dropPosition : null}
                    isDragging={activeId === item.id}
                    onEdit={() => setModal({ mode: "edit", item })}
                    onAddChild={() => setModal({ mode: "create", parentId: item.id })}
                    deleting={isPending && pendingId === item.id}
                    onDelete={() => {
                      if (!confirm("Bu menü öğesi ve altındaki tüm öğeler silinsin mi?")) return;
                      const formData = new FormData();
                      formData.set("id", item.id);
                      setPendingId(item.id);
                      startTransition(async () => {
                        await deleteMenuItemAction(formData);
                        setPendingId(null);
                        router.refresh();
                      });
                    }}
                  />
                ))}
              </div>
            </SortableContext>
            <DragOverlay>
              {activeItem ? (
                <div className="rounded-md border border-[#0ab39c] bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-lg">
                  {activeItem.label}
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </section>

      {modal ? (
        <MenuItemModal
          groupId={groupId}
          groupName={groupName}
          state={modal}
          linkOptions={linkOptions}
          parentOptions={parentOptions}
          onClose={() => setModal(null)}
        />
      ) : null}
    </>
  );
}
