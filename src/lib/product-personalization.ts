export const PRODUCT_PERSONALIZATION_KINDS = ["TEXT", "IMAGE"] as const;

export type ProductPersonalizationKindCode = (typeof PRODUCT_PERSONALIZATION_KINDS)[number];

export function isProductPersonalizationKind(
  value: string,
): value is ProductPersonalizationKindCode {
  return (PRODUCT_PERSONALIZATION_KINDS as readonly string[]).includes(value);
}

export function productPersonalizationKindLabel(kind: ProductPersonalizationKindCode) {
  switch (kind) {
    case "TEXT":
      return "Ürünün Yazısı";
    case "IMAGE":
      return "Ürün Görseli";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export type ProductPersonalizationFieldDraft = {
  clientKey: string;
  id?: string;
  kind: ProductPersonalizationKindCode;
  label: string;
  required: boolean;
  maxLength?: number | null;
};

export type ProductPersonalizationFieldView = {
  id: string;
  kind: ProductPersonalizationKindCode;
  label: string;
  required: boolean;
  sortOrder: number;
  maxLength: number | null;
};

export type CartPersonalizationEntry = {
  fieldId: string;
  kind: ProductPersonalizationKindCode;
  label: string;
  textValue?: string;
  imageUrl?: string;
};

export type CartPersonalization = {
  values: CartPersonalizationEntry[];
};

export function emptyPersonalizationDraft(
  kind: ProductPersonalizationKindCode,
): ProductPersonalizationFieldDraft {
  return {
    clientKey: `pf-${Math.random().toString(36).slice(2, 10)}`,
    kind,
    label: "",
    required: true,
    maxLength: kind === "TEXT" ? 80 : null,
  };
}

export function normalizePersonalization(
  raw: unknown,
): CartPersonalization | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const valuesRaw = (raw as { values?: unknown }).values;
  if (!Array.isArray(valuesRaw) || valuesRaw.length === 0) return undefined;
  const values: CartPersonalizationEntry[] = [];
  for (const item of valuesRaw) {
    if (!item || typeof item !== "object") continue;
    const fieldId = String((item as { fieldId?: unknown }).fieldId ?? "").trim();
    const kindRaw = String((item as { kind?: unknown }).kind ?? "").trim();
    const label = String((item as { label?: unknown }).label ?? "").trim();
    if (!fieldId || !isProductPersonalizationKind(kindRaw) || !label) continue;
    const textValue = String((item as { textValue?: unknown }).textValue ?? "").trim();
    const imageUrl = String((item as { imageUrl?: unknown }).imageUrl ?? "").trim();
    if (kindRaw === "TEXT") {
      if (!textValue) continue;
      values.push({ fieldId, kind: kindRaw, label, textValue: textValue.slice(0, 500) });
      continue;
    }
    if (!imageUrl || !imageUrl.startsWith("/uploads/")) continue;
    values.push({ fieldId, kind: kindRaw, label, imageUrl: imageUrl.slice(0, 500) });
  }
  return values.length > 0 ? { values } : undefined;
}

export function personalizationFingerprint(personalization?: CartPersonalization) {
  if (!personalization?.values.length) return "";
  return personalization.values
    .map((item) =>
      [
        item.fieldId,
        item.kind,
        item.textValue ?? "",
        item.imageUrl ?? "",
      ].join("="),
    )
    .sort()
    .join("|");
}

export function cartLineKey(variantId: string, personalization?: CartPersonalization) {
  const id = variantId.trim();
  const finger = personalizationFingerprint(personalization);
  return finger ? `${id}::${simpleHash(finger)}` : id;
}

function simpleHash(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export function formatPersonalizationSummary(personalization?: CartPersonalization | null) {
  if (!personalization?.values.length) return "";
  return personalization.values
    .map((item) => {
      switch (item.kind) {
        case "TEXT":
          return `${item.label}: ${item.textValue ?? ""}`;
        case "IMAGE":
          return `${item.label}: görsel`;
        default: {
          const _exhaustive: never = item.kind;
          return _exhaustive;
        }
      }
    })
    .join(" · ");
}

export function validatePersonalizationInput(
  fields: ProductPersonalizationFieldView[],
  values: CartPersonalizationEntry[],
): { ok: true; personalization: CartPersonalization } | { ok: false; error: string } {
  if (fields.length === 0) {
    return { ok: true, personalization: { values: [] } };
  }
  const byId = new Map(values.map((item) => [item.fieldId, item]));
  const next: CartPersonalizationEntry[] = [];
  for (const field of fields) {
    const current = byId.get(field.id);
    if (field.kind === "TEXT") {
      const text = current?.textValue?.trim() ?? "";
      if (!text) {
        if (field.required) return { ok: false, error: `"${field.label}" alanını doldurun.` };
        continue;
      }
      const max = field.maxLength && field.maxLength > 0 ? field.maxLength : 500;
      if (text.length > max) {
        return { ok: false, error: `"${field.label}" en fazla ${max} karakter olabilir.` };
      }
      next.push({
        fieldId: field.id,
        kind: "TEXT",
        label: field.label,
        textValue: text,
      });
      continue;
    }
    const imageUrl = current?.imageUrl?.trim() ?? "";
    if (!imageUrl) {
      if (field.required) return { ok: false, error: `"${field.label}" için görsel yükleyin.` };
      continue;
    }
    if (!imageUrl.startsWith("/uploads/")) {
      return { ok: false, error: `"${field.label}" görseli geçersiz.` };
    }
    next.push({
      fieldId: field.id,
      kind: "IMAGE",
      label: field.label,
      imageUrl,
    });
  }
  return { ok: true, personalization: { values: next } };
}
