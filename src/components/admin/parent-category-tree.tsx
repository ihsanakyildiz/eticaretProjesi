"use client";

import { useMemo, useState } from "react";
import { Check, ChevronRight, Search, X } from "lucide-react";

export type ParentCategoryTreeNode = {
  id: string;
  name: string;
  children: ParentCategoryTreeNode[];
};

type ParentCategoryTreePickerProps = {
  name: string;
  value: string;
  onChange: (id: string) => void;
  nodes: ParentCategoryTreeNode[];
  rootLabel?: string;
  allowEmpty?: boolean;
};

type FlatCategory = {
  id: string;
  name: string;
  pathLabels: string[];
};

function normalizeSearch(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function findPath(
  nodes: ParentCategoryTreeNode[],
  id: string,
  trail: ParentCategoryTreeNode[] = [],
): ParentCategoryTreeNode[] | null {
  for (const node of nodes) {
    const next = [...trail, node];
    if (node.id === id) return next;
    const nested = findPath(node.children, id, next);
    if (nested) return nested;
  }
  return null;
}

function flattenTree(
  nodes: ParentCategoryTreeNode[],
  prefix: string[] = [],
): FlatCategory[] {
  const rows: FlatCategory[] = [];
  for (const node of nodes) {
    const pathLabels = [...prefix, node.name];
    rows.push({ id: node.id, name: node.name, pathLabels });
    if (node.children.length) {
      rows.push(...flattenTree(node.children, pathLabels));
    }
  }
  return rows;
}

function ColumnItem({
  node,
  selected,
  onPath,
  onSelect,
}: {
  node: ParentCategoryTreeNode;
  selected: boolean;
  onPath: boolean;
  onSelect: () => void;
}) {
  const hasChildren = node.children.length > 0;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition ${
        selected
          ? "bg-[#0ab39c]/10 font-semibold text-[#0ab39c]"
          : onPath
            ? "bg-slate-50 font-medium text-slate-800"
            : "text-slate-700 hover:bg-slate-50"
      }`}
    >
      <span className="min-w-0 flex-1 truncate">{node.name}</span>
      {selected ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
      {hasChildren ? (
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
      ) : null}
    </button>
  );
}

export function ParentCategoryTreePicker({
  name,
  value,
  onChange,
  nodes,
  rootLabel = "Ana kategori",
  allowEmpty = true,
}: ParentCategoryTreePickerProps) {
  const [query, setQuery] = useState("");
  const selectedPath = useMemo(() => (value ? findPath(nodes, value) ?? [] : []), [nodes, value]);
  const catalog = useMemo(() => flattenTree(nodes), [nodes]);
  const needle = normalizeSearch(query);

  const matches = useMemo(() => {
    if (!needle) return [];
    return catalog.filter((item) => {
      const haystack = normalizeSearch(item.pathLabels.join(" "));
      return haystack.includes(needle);
    });
  }, [catalog, needle]);

  const columns = useMemo(() => {
    const next: ParentCategoryTreeNode[][] = [nodes];
    for (const node of selectedPath) {
      if (node.children.length > 0) next.push(node.children);
    }
    return next;
  }, [nodes, selectedPath]);

  const pathIds = selectedPath.map((node) => node.id);
  const selectedName = selectedPath.at(-1)?.name;

  const selectNode = (node: ParentCategoryTreeNode) => {
    setQuery("");
    onChange(node.id);
  };

  return (
    <div className="overflow-hidden rounded-md border border-[#e9ebec] bg-white">
      <input type="hidden" name={name} value={value} />

      <div className="border-b border-[#e9ebec] bg-[#f8f9fa] p-2">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Kategori ara…"
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              const first = matches[0];
              if (!first) return;
              setQuery("");
              onChange(first.id);
            }}
            className="w-full rounded-md border border-[#e9ebec] bg-white py-2 pr-8 pl-8 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-[#0ab39c] focus:ring-2 focus:ring-[#0ab39c]/20"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute top-1/2 right-2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label="Aramayı temizle"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      {needle ? (
        <div className="max-h-72 overflow-y-auto py-1">
          {matches.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-slate-500">Eşleşen kategori yok.</p>
          ) : (
            matches.map((item) => {
              const selected = item.id === value;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setQuery("");
                    onChange(item.id);
                  }}
                  className={`flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left ${
                    selected ? "bg-[#0ab39c]/10" : "hover:bg-slate-50"
                  }`}
                >
                  <span
                    className={`text-sm ${
                      selected ? "font-semibold text-[#0ab39c]" : "font-medium text-slate-800"
                    }`}
                  >
                    {item.name}
                  </span>
                  {item.pathLabels.length > 1 ? (
                    <span className="text-xs text-slate-400">{item.pathLabels.join(" › ")}</span>
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      ) : (
        <>
          <div className="flex min-h-[220px] overflow-x-auto">
            {nodes.length === 0 ? (
              <p className="px-3 py-6 text-sm text-slate-500">Henüz kategori yok.</p>
            ) : (
              columns.map((column, columnIndex) => (
                <div
                  key={columnIndex}
                  className="flex min-w-[200px] flex-1 flex-col border-r border-[#e9ebec] last:border-r-0"
                >
                  <div className="max-h-64 overflow-y-auto py-1">
                    {columnIndex === 0 && allowEmpty ? (
                      <button
                        type="button"
                        onClick={() => onChange("")}
                        className={`flex w-full items-center px-3 py-2 text-left text-sm ${
                          value === ""
                            ? "bg-[#0ab39c]/10 font-semibold text-[#0ab39c]"
                            : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {rootLabel}
                      </button>
                    ) : null}
                    {column.map((node) => (
                      <ColumnItem
                        key={node.id}
                        node={node}
                        selected={node.id === value}
                        onPath={pathIds[columnIndex] === node.id && node.id !== value}
                        onSelect={() => selectNode(node)}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
          {selectedName ? (
            <p className="border-t border-[#e9ebec] bg-[#f8f9fa] px-3 py-2 text-xs text-slate-500">
              Seçili:{" "}
              <span className="font-medium text-slate-700">{selectedPath.map((node) => node.name).join(" › ")}</span>
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
