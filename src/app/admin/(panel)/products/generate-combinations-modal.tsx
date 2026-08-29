"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Search, Sparkles, X } from "lucide-react";
import { usedAttributeValueIds } from "@/lib/product-combination-filters";
import {
  MAX_GENERATED_COMBINATIONS,
  WARN_GENERATED_COMBINATIONS,
  buildCombinationsFromValueGroups,
  combinationCountFromGroupSizes,
  type CombinationValue,
} from "@/lib/product-combinations";

export type GeneratorAttribute = {
  id: string;
  name: string;
  values: Array<{ id: string; name: string; colorHex: string | null }>;
};

function normalizeSearch(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function buildInitialSelected(
  attributes: GeneratorAttribute[],
  existingSelections: Array<{ attributeId: string; valueId: string }>,
): Record<string, Set<string>> {
  const used = usedAttributeValueIds([{ selections: existingSelections }]);
  const initial: Record<string, Set<string>> = {};
  for (const attribute of attributes) {
    const allowed = new Set(attribute.values.map((value) => value.id));
    const next = new Set<string>();
    for (const valueId of used.get(attribute.id) ?? []) {
      if (allowed.has(valueId)) next.add(valueId);
    }
    initial[attribute.id] = next;
  }
  return initial;
}

export function GenerateCombinationsModal({
  attributes,
  existingCombinationKeys,
  existingSelections,
  onClose,
  onGenerate,
}: {
  attributes: GeneratorAttribute[];
  existingCombinationKeys: string[];
  existingSelections: Array<{ attributeId: string; valueId: string }>;
  onClose: () => void;
  onGenerate: (groups: CombinationValue[][]) => void;
}) {
  const [selected, setSelected] = useState<Record<string, Set<string>>>(() =>
    buildInitialSelected(attributes, existingSelections),
  );
  const [search, setSearch] = useState("");
  const [valueSearch, setValueSearch] = useState<Record<string, string>>({});
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    const initialSelected = buildInitialSelected(attributes, existingSelections);
    const anySelected = Object.values(initialSelected).some((set) => set.size > 0);
    const initial: Record<string, boolean> = {};
    attributes.forEach((attribute, index) => {
      if (anySelected) {
        initial[attribute.id] = initialSelected[attribute.id].size === 0;
      } else {
        initial[attribute.id] = index > 1;
      }
    });
    return initial;
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const query = normalizeSearch(search);

  const filteredAttributes = useMemo(() => {
    if (!query) return attributes;
    return attributes.filter((attribute) => {
      if (normalizeSearch(attribute.name).includes(query)) return true;
      return attribute.values.some((value) => normalizeSearch(value.name).includes(query));
    });
  }, [attributes, query]);

  const groups = useMemo(() => {
    return attributes
      .map((attribute) => {
        const ids = selected[attribute.id];
        if (!ids || ids.size === 0) return null;
        return attribute.values
          .filter((value) => ids.has(value.id))
          .map((value) => ({
            attributeId: attribute.id,
            attributeName: attribute.name,
            valueId: value.id,
            valueName: value.name,
          }));
      })
      .filter((group): group is CombinationValue[] => Boolean(group && group.length));
  }, [attributes, selected]);

  const previewCount = combinationCountFromGroupSizes(groups.map((group) => group.length));
  const tooMany = previewCount > MAX_GENERATED_COMBINATIONS;
  const largeBatch = previewCount >= WARN_GENERATED_COMBINATIONS && !tooMany;

  const existingSet = useMemo(
    () => new Set(existingCombinationKeys),
    [existingCombinationKeys],
  );

  const overlap = useMemo(() => {
    if (previewCount === 0 || tooMany) {
      return { willCreate: 0, alreadyExist: 0 };
    }
    const built = buildCombinationsFromValueGroups(groups);
    let alreadyExist = 0;
    for (const row of built) {
      if (existingSet.has(row.combinationKey)) alreadyExist += 1;
    }
    return { willCreate: built.length - alreadyExist, alreadyExist };
  }, [existingSet, groups, previewCount, tooMany]);

  const existingCount = existingSet.size;
  const totalAfter = existingCount + overlap.willCreate;
  const catalogFull = totalAfter > MAX_GENERATED_COMBINATIONS;
  const formula = groups.map((group) => group.length).join(" × ");
  const canGenerate = overlap.willCreate > 0 && !tooMany && !catalogFull;

  const toggleValue = (attributeId: string, valueId: string) => {
    setSelected((prev) => {
      const next = new Set(prev[attributeId] ?? []);
      if (next.has(valueId)) next.delete(valueId);
      else next.add(valueId);
      return { ...prev, [attributeId]: next };
    });
  };

  const toggleAll = (attribute: GeneratorAttribute, allOn: boolean) => {
    setSelected((prev) => ({
      ...prev,
      [attribute.id]: allOn ? new Set() : new Set(attribute.values.map((value) => value.id)),
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" aria-label="Kapat" className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="generate-combinations-title"
        className="relative flex max-h-[min(90vh,760px)] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-[#e9ebec] bg-white shadow-xl"
      >
        <div className="border-b border-[#e9ebec] px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="generate-combinations-title" className="text-base font-semibold text-slate-800">
                Kombinasyon üret
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Her özellikten değer seçin. Seçilmeyen özellik çarpıma girmez. Mevcut SKU’lar korunur;
                yalnızca eksik kombinasyonlar eklenir.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-slate-400 hover:bg-slate-50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="relative mt-3">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Özellik veya değer ara…"
              className="w-full rounded-md border border-[#e9ebec] py-2 pr-3 pl-9 text-sm outline-none focus:border-[#0ab39c]"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-5 py-4">
          {filteredAttributes.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">Eşleşen özellik yok.</p>
          ) : (
            filteredAttributes.map((attribute) => {
              const set = selected[attribute.id] ?? new Set<string>();
              const allOn =
                attribute.values.length > 0 &&
                attribute.values.every((value) => set.has(value.id));
              const someOn = set.size > 0 && !allOn;
              const isCollapsed = Boolean(collapsed[attribute.id]) && !query;
              const innerQuery = normalizeSearch(valueSearch[attribute.id] ?? "");
              const visibleValues = innerQuery
                ? attribute.values.filter((value) => normalizeSearch(value.name).includes(innerQuery))
                : attribute.values;

              return (
                <div key={attribute.id} className="overflow-hidden rounded-md border border-[#e9ebec]">
                  <div className="flex items-center gap-3 bg-[#f8f9fa] px-3 py-2.5">
                    <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="accent-[#0ab39c]"
                        checked={allOn}
                        ref={(el) => {
                          if (el) el.indeterminate = someOn;
                        }}
                        onChange={() => toggleAll(attribute, allOn)}
                      />
                      <span className="font-semibold text-slate-800">{attribute.name}</span>
                      <span className="text-slate-500">
                        Tüm değerleri seç ({attribute.values.length})
                      </span>
                    </label>
                    {set.size > 0 ? (
                      <span className="rounded-md bg-[#0ab39c]/10 px-1.5 py-0.5 text-xs font-semibold text-[#0ab39c]">
                        {set.size}
                      </span>
                    ) : null}
                    <button
                      type="button"
                      onClick={() =>
                        setCollapsed((prev) => ({ ...prev, [attribute.id]: !prev[attribute.id] }))
                      }
                      className="rounded p-1 text-slate-500 hover:bg-white"
                      aria-expanded={!isCollapsed}
                      aria-label={isCollapsed ? "Değerleri aç" : "Değerleri gizle"}
                    >
                      <ChevronDown
                        className={`h-4 w-4 transition ${isCollapsed ? "rotate-[-90deg]" : ""}`}
                      />
                    </button>
                  </div>
                  {!isCollapsed ? (
                    <div className="px-3 py-3">
                      {attribute.values.length > 16 ? (
                        <input
                          type="search"
                          value={valueSearch[attribute.id] ?? ""}
                          onChange={(e) =>
                            setValueSearch((prev) => ({ ...prev, [attribute.id]: e.target.value }))
                          }
                          placeholder={`${attribute.name} içinde ara…`}
                          className="mb-2 w-full rounded-md border border-[#e9ebec] px-2.5 py-1.5 text-xs outline-none focus:border-[#0ab39c]"
                        />
                      ) : null}
                      <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
                        {visibleValues.map((value) => {
                          const on = set.has(value.id);
                          return (
                            <label
                              key={value.id}
                              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1 text-xs ${
                                on
                                  ? "border-[#0ab39c] bg-[#0ab39c]/10 font-medium text-slate-800"
                                  : "border-[#e9ebec] text-slate-600"
                              }`}
                            >
                              <input
                                type="checkbox"
                                className="accent-[#0ab39c]"
                                checked={on}
                                onChange={() => toggleValue(attribute.id, value.id)}
                              />
                              {value.colorHex ? (
                                <span
                                  className="inline-block h-3.5 w-3.5 rounded-sm border border-[#e9ebec]"
                                  style={{ backgroundColor: value.colorHex }}
                                />
                              ) : null}
                              {value.name}
                            </label>
                          );
                        })}
                        {visibleValues.length === 0 ? (
                          <p className="text-xs text-slate-400">Değer bulunamadı.</p>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>

        <div className="border-t border-[#e9ebec] bg-[#f3f6f9] px-5 py-3">
          <p
            className={`mb-3 text-sm ${
              tooMany || catalogFull
                ? "text-rose-600"
                : largeBatch
                  ? "text-amber-700"
                  : "text-slate-600"
            }`}
          >
            {previewCount === 0
              ? "En az bir özellikten değer seçin."
              : tooMany
                ? `${formula} = ${previewCount.toLocaleString("tr-TR")} kombinasyon. Üst sınır ${MAX_GENERATED_COMBINATIONS.toLocaleString("tr-TR")}; seçimi daraltın.`
                : catalogFull
                  ? `Üretim sonrası ${totalAfter.toLocaleString("tr-TR")} SKU olurdu. Ürün başına en fazla ${MAX_GENERATED_COMBINATIONS.toLocaleString("tr-TR")} kombinasyon var; önce listeden silin veya seçimi küçültün.`
                  : overlap.willCreate === 0
                    ? "Seçilen kombinasyonların tümü zaten listede. Yeni satır eklenmeyecek."
                    : `${formula} = ${previewCount.toLocaleString("tr-TR")} kombinasyon${
                        overlap.alreadyExist
                          ? ` · ${overlap.alreadyExist} zaten var, ${overlap.willCreate} yeni eklenecek`
                          : ` · ${overlap.willCreate} yeni SKU`
                      }.${largeBatch ? " Liste sayfalı ve filtreli açılır." : ""}`}
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-[#e9ebec] bg-white px-4 py-2 text-sm font-medium text-slate-600"
            >
              İptal
            </button>
            <button
              type="button"
              disabled={!canGenerate}
              onClick={() => onGenerate(groups)}
              className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              <Sparkles className="h-4 w-4" />
              Kombinasyonları üret
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
