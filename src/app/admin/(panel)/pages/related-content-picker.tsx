"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export type RelatedContentOption = {
  id: string;
  label: string;
  isActive: boolean;
  meta?: string | null;
};

type RelatedContentPickerProps = {
  title: string;
  fieldName: string;
  options: RelatedContentOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  emptyHref: string;
  emptyLabel: string;
  manageHref: string;
  manageLabel: string;
  searchPlaceholder: string;
  hint: string;
};

function normalizeSearch(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function RelatedContentPicker({
  title,
  fieldName,
  options,
  selectedIds,
  onChange,
  emptyHref,
  emptyLabel,
  manageHref,
  manageLabel,
  searchPlaceholder,
  hint,
}: RelatedContentPickerProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const needle = normalizeSearch(query);
    if (!needle) return options;
    return options.filter((option) => {
      const haystack = normalizeSearch([option.label, option.meta ?? ""].join(" "));
      return haystack.includes(needle);
    });
  }, [options, query]);

  const toggle = (id: string) => {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((item) => item !== id)
        : [...selectedIds, id],
    );
  };

  return (
    <div>
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <label className="block text-sm font-medium text-slate-700">{title}</label>
        <span className="text-xs text-slate-400">{selectedIds.length} seçili</span>
      </div>

      {selectedIds.map((id) => (
        <input key={id} type="hidden" name={fieldName} value={id} />
      ))}

      {options.length === 0 ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          {emptyLabel}{" "}
          <Link href={emptyHref} className="font-medium underline">
            Ekle
          </Link>{" "}
          — bu alan isteğe bağlıdır.
        </p>
      ) : (
        <div className="rounded-md border border-[#e9ebec] bg-[#f3f6f9] p-3">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="mb-3 w-full rounded-md border border-[#e9ebec] bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#0ab39c]"
          />
          <div className="admin-scroll-light max-h-52 space-y-1.5 overflow-y-auto pr-1">
            {filtered.length === 0 ? (
              <p className="px-1 py-2 text-xs text-slate-500">Eşleşen kayıt yok.</p>
            ) : (
              filtered.map((option) => {
                const checked = selectedIds.includes(option.id);
                return (
                  <label
                    key={option.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 transition ${
                      checked
                        ? "border-[#0ab39c]/40 bg-white"
                        : "border-transparent bg-white/70 hover:border-[#e9ebec]"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(option.id)}
                      className="h-4 w-4 rounded border-slate-300 text-[#0ab39c] focus:ring-[#0ab39c]"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-slate-700">
                        {option.label}
                      </span>
                      {option.meta ? (
                        <span className="block text-xs text-slate-400">{option.meta}</span>
                      ) : null}
                    </span>
                    {!option.isActive ? (
                      <span className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                        Pasif
                      </span>
                    ) : null}
                  </label>
                );
              })
            )}
          </div>
          <p className="mt-2 text-xs text-slate-400">
            {hint} Yönetim:{" "}
            <Link href={manageHref} className="text-[#405189] hover:underline">
              {manageLabel}
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
