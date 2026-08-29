"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

export type CategoryCheckboxTreeNode = {
  id: string;
  name: string;
  children: CategoryCheckboxTreeNode[];
};

function collectExpandableIds(nodes: CategoryCheckboxTreeNode[]): string[] {
  const ids: string[] = [];
  const walk = (list: CategoryCheckboxTreeNode[]) => {
    for (const node of list) {
      if (node.children.length > 0) {
        ids.push(node.id);
        walk(node.children);
      }
    }
  };
  walk(nodes);
  return ids;
}

function collectIds(nodes: CategoryCheckboxTreeNode[]): string[] {
  const ids: string[] = [];
  const walk = (list: CategoryCheckboxTreeNode[]) => {
    for (const node of list) {
      ids.push(node.id);
      if (node.children.length) walk(node.children);
    }
  };
  walk(nodes);
  return ids;
}

function TreeCheckboxRow({
  node,
  depth,
  selected,
  onToggle,
  expandedIds,
  toggleExpanded,
}: {
  node: CategoryCheckboxTreeNode;
  depth: number;
  selected: Set<string>;
  onToggle: (id: string) => void;
  expandedIds: Set<string>;
  toggleExpanded: (id: string) => void;
}) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedIds.has(node.id);
  const checked = selected.has(node.id);
  const inputId = `filter-cat-${node.id}`;

  return (
    <div>
      <div
        className="flex items-center gap-2 py-1.5"
        style={{ paddingLeft: 8 + depth * 20 }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => toggleExpanded(node.id)}
            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-500 hover:bg-slate-100"
            aria-label={isExpanded ? "Alt kategorileri kapat" : "Alt kategorileri aç"}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        ) : (
          <span className="inline-flex h-6 w-6 shrink-0" />
        )}
        <input
          id={inputId}
          type="checkbox"
          checked={checked}
          onChange={() => onToggle(node.id)}
          className="h-4 w-4 shrink-0 cursor-pointer accent-[#0ab39c]"
        />
        <label
          htmlFor={inputId}
          className={`cursor-pointer text-sm ${
            checked ? "font-medium text-slate-900" : "text-slate-700"
          }`}
        >
          {node.name}
        </label>
      </div>
      {hasChildren && isExpanded
        ? node.children.map((child) => (
            <TreeCheckboxRow
              key={child.id}
              node={child}
              depth={depth + 1}
              selected={selected}
              onToggle={onToggle}
              expandedIds={expandedIds}
              toggleExpanded={toggleExpanded}
            />
          ))
        : null}
    </div>
  );
}

export function CategoryCheckboxTree({
  name,
  nodes,
  selectedIds,
  onChange,
}: {
  name: string;
  nodes: CategoryCheckboxTreeNode[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const expandableIds = useMemo(() => collectExpandableIds(nodes), [nodes]);
  const allIds = useMemo(() => collectIds(nodes), [nodes]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () => new Set(expandableIds),
  );
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allExpanded =
    expandableIds.length > 0 && expandableIds.every((id) => expandedIds.has(id));

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllExpanded = () => {
    setExpandedIds(allExpanded ? new Set() : new Set(expandableIds));
  };

  const toggleId = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange([...next]);
  };

  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));

  return (
    <div className="overflow-hidden rounded-md border border-[#e9ebec] bg-white">
      {selectedIds.map((id) => (
        <input key={id} type="hidden" name={name} value={id} />
      ))}
      <div className="flex items-center justify-between border-b border-[#e9ebec] bg-[#f8f9fa] px-3 py-2">
        <button
          type="button"
          onClick={toggleAllExpanded}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 hover:text-slate-900"
        >
          {allExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          {allExpanded ? "Daralt" : "Genişlet"}
        </button>
        {allIds.length > 0 ? (
          <button
            type="button"
            onClick={() => onChange(allSelected ? [] : allIds)}
            className="text-sm font-medium text-[#405189] hover:underline"
          >
            {allSelected ? "Hiçbirini seçme" : "Tümünü seç"}
          </button>
        ) : null}
      </div>
      <div className="max-h-80 overflow-y-auto py-2">
        {nodes.length === 0 ? (
          <p className="px-3 py-2 text-sm text-slate-500">Henüz kategori yok.</p>
        ) : (
          nodes.map((node) => (
            <TreeCheckboxRow
              key={node.id}
              node={node}
              depth={0}
              selected={selected}
              onToggle={toggleId}
              expandedIds={expandedIds}
              toggleExpanded={toggleExpanded}
            />
          ))
        )}
      </div>
    </div>
  );
}
