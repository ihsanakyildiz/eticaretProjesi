"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";

export type SearchableSelectOption = {
  id: string;
  label: string;
  depth?: number;
  searchText?: string;
};

type SearchableSelectProps = {
  id?: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  emptyLabel?: string;
  searchPlaceholder?: string;
  noResultsLabel?: string;
  disabled?: boolean;
  className?: string;
};

function normalizeSearch(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function SearchableSelect({
  id,
  name,
  value,
  onChange,
  options,
  placeholder = "Seçin…",
  emptyLabel = "— Seçim yok —",
  searchPlaceholder = "Ara…",
  noResultsLabel = "Sonuç bulunamadı",
  disabled = false,
  className = "",
}: SearchableSelectProps) {
  const generatedId = useId();
  const triggerId = id ?? generatedId;
  const listboxId = `${triggerId}-listbox`;
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);

  const selected = useMemo(
    () => options.find((option) => option.id === value) ?? null,
    [options, value],
  );

  const filtered = useMemo(() => {
    const needle = normalizeSearch(query);
    if (!needle) return options;
    return options.filter((option) => {
      const haystack = normalizeSearch(option.searchText ?? option.label);
      return haystack.includes(needle);
    });
  }, [options, query]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    };

    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setHighlightIndex(0);
    const timer = window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    setHighlightIndex(0);
  }, [query]);

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  const selectValue = (next: string) => {
    onChange(next);
    close();
  };

  const onTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setOpen(true);
    }
  };

  const onSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const itemCount = filtered.length + 1; // empty option + filtered

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightIndex((prev) => (prev + 1) % itemCount);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightIndex((prev) => (prev - 1 + itemCount) % itemCount);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (highlightIndex === 0) {
        selectValue("");
        return;
      }
      const option = filtered[highlightIndex - 1];
      if (option) selectValue(option.id);
      return;
    }
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <input type="hidden" name={name} value={value} />

      <button
        id={triggerId}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        onKeyDown={onTriggerKeyDown}
        className="flex w-full items-center justify-between gap-2 rounded-md border border-[#e9ebec] bg-white px-3 py-2.5 text-left text-sm text-slate-800 outline-none transition hover:border-slate-300 focus:border-[#0ab39c] focus:ring-2 focus:ring-[#0ab39c]/20 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className={`min-w-0 truncate ${selected ? "text-slate-800" : "text-slate-400"}`}>
          {selected ? (
            <span className="inline-flex items-center gap-1.5">
              {selected.depth && selected.depth > 0 ? (
                <span className="shrink-0 text-[10px] font-semibold tracking-wide text-[#405189] uppercase">
                  Alt · {selected.depth}
                </span>
              ) : null}
              <span>{selected.label}</span>
            </span>
          ) : (
            placeholder
          )}
        </span>
        <span className="flex shrink-0 items-center gap-1 text-slate-400">
          {value ? (
            <span
              role="button"
              tabIndex={-1}
              aria-label="Seçimi temizle"
              className="rounded p-0.5 hover:bg-slate-100 hover:text-slate-600"
              onClick={(event) => {
                event.stopPropagation();
                onChange("");
              }}
            >
              <X className="h-3.5 w-3.5" />
            </span>
          ) : null}
          <ChevronsUpDown className="h-4 w-4" />
        </span>
      </button>

      {open ? (
        <div className="absolute z-40 mt-1 w-full overflow-hidden rounded-md border border-[#e9ebec] bg-white shadow-lg">
          <div className="border-b border-[#e9ebec] p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onSearchKeyDown}
                placeholder={searchPlaceholder}
                className="w-full rounded-md border border-[#e9ebec] bg-[#f3f6f9] py-2 pr-3 pl-9 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-[#0ab39c] focus:bg-white focus:ring-2 focus:ring-[#0ab39c]/20"
              />
            </div>
          </div>

          <ul
            id={listboxId}
            role="listbox"
            aria-labelledby={triggerId}
            className="max-h-64 overflow-y-auto py-1"
          >
            <li role="option" aria-selected={value === ""}>
              <button
                type="button"
                onMouseEnter={() => setHighlightIndex(0)}
                onClick={() => selectValue("")}
                className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm ${
                  highlightIndex === 0 ? "bg-[#f3f6f9]" : ""
                } ${value === "" ? "font-medium text-[#0ab39c]" : "text-slate-500"}`}
              >
                <span>{emptyLabel}</span>
                {value === "" ? <Check className="h-4 w-4 shrink-0" /> : null}
              </button>
            </li>

            {filtered.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-slate-400">{noResultsLabel}</li>
            ) : (
              filtered.map((option, index) => {
                const itemIndex = index + 1;
                const isSelected = option.id === value;
                const isHighlighted = highlightIndex === itemIndex;
                const depth = option.depth ?? 0;

                return (
                  <li key={option.id} role="option" aria-selected={isSelected}>
                    <button
                      type="button"
                      onMouseEnter={() => setHighlightIndex(itemIndex)}
                      onClick={() => selectValue(option.id)}
                      className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm ${
                        isHighlighted ? "bg-[#f3f6f9]" : ""
                      } ${isSelected ? "font-medium text-[#0ab39c]" : "text-slate-700"}`}
                      style={{ paddingLeft: `${12 + depth * 14}px` }}
                    >
                      <span className="min-w-0 truncate">
                        {depth > 0 ? (
                          <span className="mr-1.5 text-slate-300">└</span>
                        ) : null}
                        {option.label}
                      </span>
                      {isSelected ? <Check className="h-4 w-4 shrink-0" /> : null}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
