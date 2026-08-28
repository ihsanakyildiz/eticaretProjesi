"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, LayoutGrid, Plus, Trash2 } from "lucide-react";
import {
  GRID_PRESETS,
  getDefaultGridRowConfig,
  type GridColumnDef,
} from "@/config/page-grid";
import {
  getGridRowSettings,
  getPageSectionTypeMeta,
  isNestablePageSectionType,
  PAGE_SECTION_TYPE_META,
  parseSectionSettings,
  type PageSectionTypeValue,
} from "@/lib/page-sections";
import { SectionHeaderForm } from "@/components/admin/section-header-form";
import {
  addPageSectionAction,
  deletePageSectionAction,
  reorderGridChildrenAction,
  updateGridRowLayoutAction,
} from "@/app/admin/(panel)/pages/actions";

type GridChildSection = {
  id: string;
  type: PageSectionTypeValue;
  label: string | null;
  title: string | null;
  subtitle: string | null;
  settings: string | null;
};

type ColumnItems = Record<string, string[]>;

type GridRowEditorProps = {
  pageId: string;
  section: {
    id: string;
    type: PageSectionTypeValue;
    label: string | null;
    title: string | null;
    subtitle: string | null;
    settings: string | null;
  };
  childSections: GridChildSection[];
  openChildId: string | null;
  onOpenChild: (id: string) => void;
  onChildDeleted?: (id: string) => void;
  renderChild: (section: GridChildSection) => ReactNode;
};

function buildColumnItems(
  columns: GridColumnDef[],
  childSections: GridChildSection[],
): ColumnItems {
  const map: ColumnItems = {};
  for (const column of columns) map[column.id] = [];
  const fallback = columns[0]?.id;
  for (const child of childSections) {
    const parsed = parseSectionSettings(child.settings);
    const columnId = parsed.gridCol?.columnId;
    const target =
      (columnId && map[columnId] !== undefined ? columnId : null) ?? fallback;
    if (!target) continue;
    map[target]!.push(child.id);
  }
  return map;
}

function flattenPlacements(
  columns: GridColumnDef[],
  items: ColumnItems,
): { id: string; columnId: string }[] {
  const placements: { id: string; columnId: string }[] = [];
  for (const column of columns) {
    for (const id of items[column.id] ?? []) {
      placements.push({ id, columnId: column.id });
    }
  }
  return placements;
}

function findContainer(id: string, items: ColumnItems): string | undefined {
  if (id in items) return id;
  return Object.keys(items).find((key) => items[key]?.includes(id));
}

function GridChildRow({
  child,
  pending,
  onOpen,
  onDelete,
  dragHandleProps,
  isDragging,
  setNodeRef,
  style,
}: {
  child: GridChildSection;
  pending: boolean;
  onOpen: () => void;
  onDelete: () => void;
  dragHandleProps?: HTMLAttributes<HTMLButtonElement>;
  isDragging?: boolean;
  setNodeRef?: (node: HTMLElement | null) => void;
  style?: CSSProperties;
}) {
  const meta = getPageSectionTypeMeta(child.type);
  const title = child.label || meta.defaultLabel;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={isDragging ? "opacity-40" : undefined}
    >
      <div className="flex items-center gap-1 rounded-md border border-[#e9ebec] bg-[#f8f9fb]">
        <button
          type="button"
          className="cursor-grab touch-none px-1.5 py-2 text-slate-400 hover:text-slate-600 active:cursor-grabbing disabled:cursor-default"
          title="Sürükle"
          aria-label="Sürükle"
          disabled={!dragHandleProps}
          {...dragHandleProps}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onOpen}
          className="min-w-0 flex-1 py-1.5 pr-1 text-left text-xs font-medium text-slate-700 hover:text-[#405189]"
        >
          <span className="block truncate">{title}</span>
          <span className="block text-[10px] font-normal text-slate-400">
            {meta.label}
          </span>
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onDelete();
          }}
          className="mr-1 rounded-md p-1.5 text-red-500 hover:bg-red-50 disabled:opacity-60"
          title="Sil"
          aria-label="Sil"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function SortableGridChild({
  child,
  pending,
  onOpen,
  onDelete,
}: {
  child: GridChildSection;
  pending: boolean;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: child.id });

  return (
    <GridChildRow
      child={child}
      pending={pending}
      onOpen={onOpen}
      onDelete={onDelete}
      setNodeRef={setNodeRef}
      isDragging={isDragging}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      dragHandleProps={{ ...attributes, ...listeners }}
    />
  );
}

function DroppableColumn({
  columnId,
  children,
}: {
  columnId: string;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: columnId });
  return (
    <div
      ref={setNodeRef}
      className={`min-h-[4.5rem] space-y-2 rounded-md p-0.5 transition-colors ${
        isOver ? "bg-[#405189]/5 ring-1 ring-[#405189]/30" : ""
      }`}
    >
      {children}
    </div>
  );
}

export function GridRowEditor({
  pageId,
  section,
  childSections,
  openChildId,
  onOpenChild,
  onChildDeleted,
  renderChild,
}: GridRowEditorProps) {
  const router = useRouter();
  const settings = useMemo(
    () => parseSectionSettings(section.settings),
    [section.settings],
  );
  const initial = getGridRowSettings(settings);
  const [columns, setColumns] = useState<GridColumnDef[]>(initial.columns);
  const [gutter, setGutter] = useState(initial.gutter);
  const [alignItems, setAlignItems] = useState(initial.alignItems);
  const [useContainer, setUseContainer] = useState(initial.useContainer);
  const [pickerColumnId, setPickerColumnId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dndReady, setDndReady] = useState(false);
  const [columnItems, setColumnItems] = useState<ColumnItems>(() =>
    buildColumnItems(initial.columns, childSections),
  );
  const columnItemsRef = useRef(columnItems);
  columnItemsRef.current = columnItems;

  useEffect(() => {
    setDndReady(true);
  }, []);

  useEffect(() => {
    const nextColumns = getGridRowSettings(
      parseSectionSettings(section.settings),
    ).columns;
    setColumns(nextColumns);
    const nextItems = buildColumnItems(nextColumns, childSections);
    columnItemsRef.current = nextItems;
    setColumnItems(nextItems);
  }, [section.settings, childSections]);

  const childById = useMemo(() => {
    const map = new Map<string, GridChildSection>();
    for (const child of childSections) map.set(child.id, child);
    return map;
  }, [childSections]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const saveLayout = (next: {
    columns?: GridColumnDef[];
    gutter?: typeof gutter;
    alignItems?: typeof alignItems;
    useContainer?: boolean;
    presetId?: string;
  }) => {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await updateGridRowLayoutAction(section.id, {
        presetId: next.presetId,
        gutter: next.gutter ?? gutter,
        alignItems: next.alignItems ?? alignItems,
        useContainer: next.useContainer ?? useContainer,
        columnsJson: JSON.stringify(next.columns ?? columns),
      });
      if (result.error) setError(result.error);
      else {
        setMessage(result.message ?? "Kaydedildi");
        if (next.columns) setColumns(next.columns);
        if (next.gutter !== undefined) setGutter(next.gutter);
        if (next.alignItems) setAlignItems(next.alignItems);
        if (next.useContainer !== undefined) setUseContainer(next.useContainer);
        router.refresh();
      }
    });
  };

  const applyPreset = (presetId: string) => {
    const preset = GRID_PRESETS.find((item) => item.id === presetId);
    if (!preset) return;
    const nextColumns = preset.spans.map((span, index) => ({
      id: columns[index]?.id ?? `c_${Math.random().toString(36).slice(2, 8)}`,
      span: {
        xs: 12,
        sm: span >= 6 ? span : 12,
        md: span,
        lg: span,
        xl: span,
      },
    }));
    setColumns(nextColumns);
    setColumnItems(buildColumnItems(nextColumns, childSections));
    saveLayout({ presetId, columns: nextColumns });
  };

  const addToColumn = (columnId: string, type: PageSectionTypeValue) => {
    setPickerColumnId(null);
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await addPageSectionAction(pageId, type, {
        parentId: section.id,
        columnId,
      });
      if (result.error) setError(result.error);
      else {
        setMessage(result.message ?? "Bölüm eklendi");
        router.refresh();
      }
    });
  };

  const deleteChild = (childId: string) => {
    if (!window.confirm("Bu bölümü grid’den silmek istediğinize emin misiniz?")) {
      return;
    }
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await deletePageSectionAction(childId);
      if (result.error) {
        setError(result.error);
        return;
      }
      onChildDeleted?.(childId);
      setColumnItems((prev) => {
        const next: ColumnItems = {};
        for (const [columnId, ids] of Object.entries(prev)) {
          next[columnId] = ids.filter((id) => id !== childId);
        }
        return next;
      });
      setMessage(result.message ?? "Bölüm silindi");
      router.refresh();
    });
  };

  const persistPlacements = (items: ColumnItems, previous: ColumnItems) => {
    const placements = flattenPlacements(columns, items);
    startTransition(async () => {
      setMessage(null);
      setError(null);
      const result = await reorderGridChildrenAction(
        pageId,
        section.id,
        placements,
      );
      if (result.error) {
        columnItemsRef.current = previous;
        setColumnItems(previous);
        setError(result.error);
        return;
      }
      setMessage(result.message ?? "Sıra kaydedildi");
      router.refresh();
    });
  };

  const onDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const onDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeItemId = String(active.id);
    const overId = String(over.id);
    const prev = columnItemsRef.current;

    const activeContainer = findContainer(activeItemId, prev);
    const overContainer =
      findContainer(overId, prev) ?? (overId in prev ? overId : undefined);

    if (!activeContainer || !overContainer || activeContainer === overContainer) {
      return;
    }

    const activeIds = [...(prev[activeContainer] ?? [])];
    const overIds = [...(prev[overContainer] ?? [])];
    const activeIndex = activeIds.indexOf(activeItemId);
    if (activeIndex < 0) return;

    let newIndex: number;
    if (overId in prev) {
      newIndex = overIds.length + 1;
    } else {
      const overIndex = overIds.indexOf(overId);
      const isBelowOverItem =
        active.rect.current.translated &&
        active.rect.current.translated.top > over.rect.top + over.rect.height;
      const modifier = isBelowOverItem ? 1 : 0;
      newIndex = overIndex >= 0 ? overIndex + modifier : overIds.length + 1;
    }

    const next: ColumnItems = {
      ...prev,
      [activeContainer]: activeIds.filter((id) => id !== activeItemId),
      [overContainer]: [
        ...overIds.slice(0, newIndex),
        activeItemId,
        ...overIds.slice(newIndex),
      ],
    };
    columnItemsRef.current = next;
    setColumnItems(next);
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const activeItemId = String(active.id);
    const overId = String(over.id);
    const current = columnItemsRef.current;
    const activeContainer = findContainer(activeItemId, current);
    const overContainer =
      findContainer(overId, current) ??
      (overId in current ? overId : undefined);

    if (!activeContainer || !overContainer) return;

    const previousSnapshot = buildColumnItems(columns, childSections);

    if (activeContainer === overContainer) {
      const ids = current[activeContainer] ?? [];
      const oldIndex = ids.indexOf(activeItemId);
      const newIndex = ids.indexOf(overId);
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) {
        // Cross-column may already be applied via onDragOver
        const before = flattenPlacements(columns, previousSnapshot);
        const after = flattenPlacements(columns, current);
        if (JSON.stringify(before) !== JSON.stringify(after)) {
          persistPlacements(current, previousSnapshot);
        }
        return;
      }

      const next = {
        ...current,
        [activeContainer]: arrayMove(ids, oldIndex, newIndex),
      };
      columnItemsRef.current = next;
      setColumnItems(next);
      persistPlacements(next, previousSnapshot);
      return;
    }

    persistPlacements(current, previousSnapshot);
  };

  const nestableTypes = PAGE_SECTION_TYPE_META.filter((item) =>
    isNestablePageSectionType(item.type),
  );

  const activeChild = activeId ? childById.get(activeId) ?? null : null;

  const columnsGrid = (
    <div className="grid gap-3 lg:grid-cols-12">
      {columns.map((column) => {
        const md = column.span.md ?? column.span.xs;
        const ids = columnItems[column.id] ?? [];
        const list = (
          <div className="min-h-[4.5rem] space-y-2">
            {ids.length === 0 ? (
              <p className="rounded-md bg-slate-50 px-2 py-4 text-center text-[11px] text-slate-400">
                Bu kolon boş. Bölüm ekleyin
                {dndReady ? " veya buraya sürükleyin." : "."}
              </p>
            ) : (
              ids.map((id) => {
                const child = childById.get(id);
                if (!child) return null;
                const rowProps = {
                  child,
                  pending,
                  onOpen: () => onOpenChild(child.id),
                  onDelete: () => deleteChild(child.id),
                };
                return dndReady ? (
                  <SortableGridChild key={id} {...rowProps} />
                ) : (
                  <GridChildRow key={id} {...rowProps} />
                );
              })
            )}
          </div>
        );

        return (
          <div
            key={column.id}
            className="rounded-lg border border-dashed border-[#c5cbd3] bg-white p-3"
            style={{
              gridColumn: `span ${Math.max(1, Math.min(12, md))} / span ${Math.max(1, Math.min(12, md))}`,
            }}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-slate-600">
                Kolon · md-{md} / xs-{column.span.xs}
              </p>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  setPickerColumnId((current) =>
                    current === column.id ? null : column.id,
                  )
                }
                className="inline-flex items-center gap-1 rounded-md bg-[#405189] px-2 py-1 text-[11px] font-medium text-white hover:bg-[#364574] disabled:opacity-60"
              >
                <Plus className="h-3 w-3" />
                Bölüm
              </button>
            </div>

            {pickerColumnId === column.id ? (
              <div className="mb-3 grid gap-1.5 sm:grid-cols-2">
                {nestableTypes.map((item) => (
                  <button
                    key={item.type}
                    type="button"
                    disabled={pending}
                    onClick={() => addToColumn(column.id, item.type)}
                    className="rounded-md border border-[#e9ebec] px-2 py-1.5 text-left text-[11px] text-slate-700 hover:border-[#405189] hover:bg-[#405189]/5"
                  >
                    <span className="font-semibold">{item.label}</span>
                    <span className="mt-0.5 block text-slate-400">
                      {item.description}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}

            {dndReady ? (
              <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                <DroppableColumn columnId={column.id}>{list}</DroppableColumn>
              </SortableContext>
            ) : (
              list
            )}

            {ids.map((id) => {
              const child = childById.get(id);
              if (!child) return null;
              const editor = renderChild(child);
              const isOpen = openChildId === child.id;
              return isOpen ? (
                <div key={`editor-${id}`} className="mt-2 space-y-2">
                  <SectionHeaderForm
                    sectionId={child.id}
                    type={child.type}
                    title={child.title}
                    subtitle={child.subtitle}
                    eyebrow={parseSectionSettings(child.settings).eyebrow}
                    compact
                  />
                  {editor}
                </div>
              ) : null;
            })}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-4 border-t border-[#e9ebec] pt-4">
      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          {message}
        </p>
      ) : null}

      <SectionHeaderForm
        sectionId={section.id}
        type={section.type}
        label={section.label}
        title={section.title}
        subtitle={section.subtitle}
        eyebrow={settings.eyebrow}
        anchorId={settings.anchorId}
        showAdminFields
      />

      <div className="rounded-lg border border-[#e9ebec] bg-[#f8f9fb] p-3">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
          <LayoutGrid className="h-3.5 w-3.5" />
          Bootstrap grid (12 kolon)
        </div>
        <div className="flex flex-wrap gap-2">
          {GRID_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              disabled={pending}
              onClick={() => applyPreset(preset.id)}
              className="rounded-md border border-[#e9ebec] bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:border-[#405189] hover:text-[#405189] disabled:opacity-60"
              title={preset.description}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-600">
              Boşluk (gutter)
            </label>
            <select
              value={gutter}
              disabled={pending}
              onChange={(event) => {
                const value = Number(event.target.value) as 0 | 1 | 2 | 3 | 4 | 5;
                setGutter(value);
                saveLayout({ gutter: value });
              }}
              className="w-full rounded-md border border-[#e9ebec] bg-white px-2 py-1.5 text-sm"
            >
              {[0, 1, 2, 3, 4, 5].map((value) => (
                <option key={value} value={value}>
                  g-{value}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-600">
              Dikey hizalama
            </label>
            <select
              value={alignItems}
              disabled={pending}
              onChange={(event) => {
                const value = event.target.value as "start" | "center" | "stretch";
                setAlignItems(value);
                saveLayout({ alignItems: value });
              }}
              className="w-full rounded-md border border-[#e9ebec] bg-white px-2 py-1.5 text-sm"
            >
              <option value="stretch">Stretch</option>
              <option value="start">Start</option>
              <option value="center">Center</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-600">
              Container
            </label>
            <select
              value={useContainer ? "1" : "0"}
              disabled={pending}
              onChange={(event) => {
                const value = event.target.value === "1";
                setUseContainer(value);
                saveLayout({ useContainer: value });
              }}
              className="w-full rounded-md border border-[#e9ebec] bg-white px-2 py-1.5 text-sm"
            >
              <option value="1">Açık (max-width)</option>
              <option value="0">Kapalı (full bleed)</option>
            </select>
          </div>
        </div>
      </div>

      {dndReady ? (
        <DndContext
          id={`grid-children-${section.id}`}
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
          onDragCancel={() => setActiveId(null)}
        >
          {columnsGrid}
          <DragOverlay>
            {activeChild ? (
              <div className="rounded-md border border-[#405189] bg-white px-3 py-2 shadow-xl">
                <p className="text-xs font-semibold text-slate-800">
                  {activeChild.label ||
                    getPageSectionTypeMeta(activeChild.type).defaultLabel}
                </p>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        columnsGrid
      )}

      <p className="text-[11px] text-slate-400">
        Tutamacı sürükleyerek kolon içinde sıralayın veya başka kolona taşıyın.
        Silmek için çöp kutusunu kullanın.
      </p>
    </div>
  );
}

export function getDefaultGridSettingsJson() {
  return JSON.stringify({ gridRow: getDefaultGridRowConfig() });
}
