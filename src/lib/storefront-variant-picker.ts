import type { ProductAttributeDisplayType } from "@prisma/client";

export type StorefrontVariantOption = {
  attributeId: string;
  attributeName: string;
  attributeSlug: string;
  attributeSortOrder: number;
  displayType: ProductAttributeDisplayType;
  valueId: string;
  valueName: string;
  valueSlug: string;
  valueSortOrder: number;
  colorHex: string | null;
  image: string | null;
  attributeValues?: Array<{
    id: string;
    name: string;
    slug: string;
    sortOrder: number;
    colorHex: string | null;
    image: string | null;
  }>;
};

export type StorefrontVariantAxis = {
  attributeId: string;
  name: string;
  slug: string;
  sortOrder: number;
  displayType: ProductAttributeDisplayType;
  values: Array<{
    id: string;
    name: string;
    slug: string;
    sortOrder: number;
    colorHex: string | null;
    image: string | null;
  }>;
};

export function selectionMapFromVariant(variant: {
  selections: Array<{ attributeId: string; valueId: string }>;
} | null | undefined): Record<string, string> {
  const next: Record<string, string> = {};
  for (const selection of variant?.selections ?? []) {
    next[selection.attributeId] = selection.valueId;
  }
  return next;
}

export function buildStorefrontVariantAxes(
  variants: Array<{ selections: StorefrontVariantOption[] }>,
): StorefrontVariantAxis[] {
  const axes = new Map<string, StorefrontVariantAxis>();
  for (const variant of variants) {
    for (const selection of variant.selections) {
      let axis = axes.get(selection.attributeId);
      if (!axis) {
        axis = {
          attributeId: selection.attributeId,
          name: selection.attributeName,
          slug: selection.attributeSlug,
          sortOrder: selection.attributeSortOrder,
          displayType: selection.displayType,
          values: [],
        };
        axes.set(selection.attributeId, axis);
      }
      if (!axis.values.some((value) => value.id === selection.valueId)) {
        axis.values.push({
          id: selection.valueId,
          name: selection.valueName,
          slug: selection.valueSlug,
          sortOrder: selection.valueSortOrder,
          colorHex: selection.colorHex,
          image: selection.image,
        });
      }
      if (
        (selection.displayType === "COLOR" || selection.displayType === "IMAGE") &&
        selection.attributeValues
      ) {
        for (const value of selection.attributeValues) {
          if (axis.values.some((item) => item.id === value.id)) continue;
          axis.values.push({
            id: value.id,
            name: value.name,
            slug: value.slug,
            sortOrder: value.sortOrder,
            colorHex: value.colorHex,
            image: value.image,
          });
        }
      }
    }
  }
  for (const axis of axes.values()) {
    axis.values.sort(
      (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "tr"),
    );
  }
  return [...axes.values()].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "tr"),
  );
}

export function findVariantBySelection<
  T extends { selections: Array<{ attributeId: string; valueId: string }> },
>(variants: T[], selected: Record<string, string>): T | undefined {
  return variants.find((variant) =>
    variant.selections.every(
      (selection) => selected[selection.attributeId] === selection.valueId,
    ),
  );
}

export function valuesAvailableForAxis<
  T extends { selections: Array<{ attributeId: string; valueId: string }> },
>(
  variants: T[],
  attributeId: string,
  required: Record<string, string>,
): Set<string> {
  const available = new Set<string>();
  for (const variant of variants) {
    const matchesRequired = Object.entries(required).every(([axisId, valueId]) =>
      variant.selections.some(
        (selection) => selection.attributeId === axisId && selection.valueId === valueId,
      ),
    );
    if (!matchesRequired) continue;
    const hit = variant.selections.find((selection) => selection.attributeId === attributeId);
    if (hit) available.add(hit.valueId);
  }
  return available;
}

export function constrainVariantSelection(
  axes: StorefrontVariantAxis[],
  variants: Array<{ selections: Array<{ attributeId: string; valueId: string }> }>,
  selected: Record<string, string>,
  changedAttributeId: string,
): Record<string, string> {
  const next = { ...selected };
  const changedIndex = axes.findIndex((axis) => axis.attributeId === changedAttributeId);
  const start = changedIndex >= 0 ? changedIndex + 1 : 0;

  for (let index = start; index < axes.length; index += 1) {
    const axis = axes[index];
    if (!axis) continue;
    const required: Record<string, string> = {};
    for (let prior = 0; prior < index; prior += 1) {
      const priorAxis = axes[prior];
      if (!priorAxis) continue;
      const valueId = next[priorAxis.attributeId];
      if (valueId) required[priorAxis.attributeId] = valueId;
    }
    const available = valuesAvailableForAxis(variants, axis.attributeId, required);
    const current = next[axis.attributeId];
    if (current && available.has(current)) continue;
    const fallback = axis.values.find((value) => available.has(value.id));
    if (fallback) next[axis.attributeId] = fallback.id;
    else delete next[axis.attributeId];
  }

  return next;
}

export function selectionFromSearchParams(
  axes: StorefrontVariantAxis[],
  params: URLSearchParams,
): Record<string, string> {
  const next: Record<string, string> = {};
  for (const axis of axes) {
    const raw = params.get(axis.slug)?.trim();
    if (!raw) continue;
    const value = axis.values.find(
      (item) =>
        item.slug === raw ||
        item.id === raw ||
        item.name.toLocaleLowerCase("tr-TR") === raw.toLocaleLowerCase("tr-TR"),
    );
    if (value) next[axis.attributeId] = value.id;
  }
  return next;
}

export function searchParamsFromSelection(
  axes: StorefrontVariantAxis[],
  selected: Record<string, string>,
  current: URLSearchParams,
): URLSearchParams {
  const next = new URLSearchParams(current.toString());
  for (const axis of axes) {
    const valueId = selected[axis.attributeId];
    const value = axis.values.find((item) => item.id === valueId);
    if (value?.slug) next.set(axis.slug, value.slug);
    else next.delete(axis.slug);
  }
  return next;
}

export function writeVariantSearchToUrl(
  axes: StorefrontVariantAxis[],
  selected: Record<string, string>,
) {
  if (typeof window === "undefined" || axes.length === 0) return;
  const url = new URL(window.location.href);
  const next = searchParamsFromSelection(axes, selected, url.searchParams);
  const qs = next.toString();
  const href = `${url.pathname}${qs ? `?${qs}` : ""}${url.hash}`;
  const current = `${url.pathname}${url.search}${url.hash}`;
  if (href === current) return;
  window.history.replaceState(window.history.state, "", href);
}
