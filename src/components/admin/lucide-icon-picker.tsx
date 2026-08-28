"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { LUCIDE_ICON_NAMES, LucideIconByName } from "@/lib/lucide-icons";

type LucideIconPickerProps = {
  value: string;
  onChange: (name: string) => void;
  name?: string;
  /** Önizleme rengi (hex) */
  color?: string;
};

const PAGE_SIZE = 120;

export function LucideIconPicker({
  value,
  onChange,
  name = "icon",
  color,
}: LucideIconPickerProps) {
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filtered = useMemo(() => {
    const needle = query
      .toLocaleLowerCase("tr-TR")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "")
      .trim();

    if (!needle) return LUCIDE_ICON_NAMES;

    return LUCIDE_ICON_NAMES.filter((iconName) =>
      iconName.toLowerCase().includes(needle),
    );
  }, [query]);

  const visible = filtered.slice(0, visibleCount);

  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={value} />

      <div className="flex flex-wrap items-center gap-3">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-lg border border-[#e9ebec] bg-[#f3f6f9]"
          style={{ color: color || "#405189" }}
        >
          {value ? (
            <LucideIconByName name={value} className="h-6 w-6" />
          ) : (
            <span className="text-[10px] text-slate-400">—</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-700">
            {value || "İkon seçilmedi"}
          </p>
          <p className="text-xs text-slate-400">
            Lucide Icons · ücretsiz · MIT lisans · {LUCIDE_ICON_NAMES.length}+ ikon
          </p>
        </div>
        {value ? (
          <button
            type="button"
            onClick={() => onChange("")}
            className="inline-flex items-center gap-1 rounded-md border border-[#e9ebec] px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            <X className="h-3.5 w-3.5" />
            Temizle
          </button>
        ) : null}
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setVisibleCount(PAGE_SIZE);
          }}
          placeholder="İkon ara… (ör. globe, code, phone)"
          className="w-full rounded-md border border-[#e9ebec] bg-white py-2.5 pr-3 pl-9 text-sm outline-none focus:border-[#0ab39c] focus:ring-2 focus:ring-[#0ab39c]/20"
        />
      </div>

      <div className="admin-scroll-light max-h-72 overflow-y-auto rounded-md border border-[#e9ebec] bg-[#f8f9fb] p-2">
        {visible.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-slate-500">Eşleşen ikon yok.</p>
        ) : (
          <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8 md:grid-cols-10">
            {visible.map((iconName) => {
              const selected = value === iconName;
              return (
                <button
                  key={iconName}
                  type="button"
                  title={iconName}
                  onClick={() => onChange(iconName)}
                  className={`flex h-10 items-center justify-center rounded-md border transition ${
                    selected
                      ? "border-[#0ab39c] bg-white text-[#0ab39c] shadow-sm"
                      : "border-transparent bg-white/80 text-slate-600 hover:border-[#e9ebec] hover:text-[#405189]"
                  }`}
                >
                  <LucideIconByName name={iconName} className="h-4 w-4" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {filtered.length > visibleCount ? (
        <button
          type="button"
          onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
          className="text-sm font-medium text-[#405189] hover:underline"
        >
          Daha fazla göster ({filtered.length - visibleCount} kaldı)
        </button>
      ) : (
        <p className="text-xs text-slate-400">{filtered.length} ikon listeleniyor</p>
      )}
    </div>
  );
}
