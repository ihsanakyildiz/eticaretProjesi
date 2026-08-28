export const CONTACT_FORM_FIELD_TYPES = [
  "text",
  "email",
  "tel",
  "url",
  "number",
  "textarea",
  "select",
  "radio",
  "checkbox",
  "date",
  "time",
  "hidden",
] as const;

export type ContactFormFieldType = (typeof CONTACT_FORM_FIELD_TYPES)[number];

export type ContactFormFieldOption = {
  label: string;
  value: string;
};

export type ContactFormField = {
  id: string;
  type: ContactFormFieldType;
  name: string;
  label: string;
  placeholder?: string;
  helpText?: string;
  required?: boolean;
  halfWidth?: boolean;
  rows?: number;
  options?: ContactFormFieldOption[];
  defaultValue?: string;
};

export type ContactFormConfig = {
  submitLabel?: string;
  successMessage?: string;
  introHtml?: string;
  fields: ContactFormField[];
};

export const CONTACT_FORM_FIELD_TYPE_META: {
  type: ContactFormFieldType;
  label: string;
  description: string;
}[] = [
  { type: "text", label: "Metin", description: "Tek satır metin" },
  { type: "email", label: "E-posta", description: "E-posta adresi" },
  { type: "tel", label: "Telefon", description: "Telefon numarası" },
  { type: "url", label: "URL", description: "Web sitesi adresi" },
  { type: "number", label: "Sayı", description: "Sayısal değer" },
  { type: "textarea", label: "Çok satırlı metin", description: "Uzun mesaj alanı" },
  { type: "select", label: "Seçim listesi", description: "Açılır menü" },
  { type: "radio", label: "Radyo butonları", description: "Tek seçenek" },
  { type: "checkbox", label: "Onay kutusu", description: "Evet / hayır" },
  { type: "date", label: "Tarih", description: "Tarih seçici" },
  { type: "time", label: "Saat", description: "Saat seçici" },
  { type: "hidden", label: "Gizli alan", description: "Kullanıcıya görünmez" },
];

function slugifyName(raw: string) {
  return raw
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

export function createContactFormFieldId() {
  return `f_${Math.random().toString(36).slice(2, 10)}`;
}

export function createContactFormField(
  type: ContactFormFieldType,
  overrides?: Partial<ContactFormField>,
): ContactFormField {
  const meta = CONTACT_FORM_FIELD_TYPE_META.find((item) => item.type === type);
  const label = overrides?.label ?? meta?.label ?? "Alan";
  const name =
    overrides?.name ??
    slugifyName(label) ??
    type;

  const base: ContactFormField = {
    id: overrides?.id ?? createContactFormFieldId(),
    type,
    name: name || type,
    label,
    placeholder: overrides?.placeholder,
    helpText: overrides?.helpText,
    required: overrides?.required ?? false,
    halfWidth: overrides?.halfWidth ?? false,
    rows: overrides?.rows,
    options: overrides?.options,
    defaultValue: overrides?.defaultValue,
  };

  if (type === "textarea" && !base.rows) base.rows = 5;
  if ((type === "select" || type === "radio") && !base.options?.length) {
    base.options = [
      { label: "Seçenek 1", value: "option_1" },
      { label: "Seçenek 2", value: "option_2" },
    ];
  }
  if (type === "checkbox" && !base.label) {
    base.label = "Kabul ediyorum";
  }

  return base;
}

export function getDefaultContactFormConfig(): ContactFormConfig {
  return {
    submitLabel: "Mesaj Gönder",
    successMessage: "Mesajınız alındı. En kısa sürede size dönüş yapacağız.",
    fields: [
      createContactFormField("text", {
        name: "name",
        label: "Adınız Soyadınız",
        placeholder: "Adınız Soyadınız",
        required: true,
        halfWidth: true,
      }),
      createContactFormField("email", {
        name: "email",
        label: "E-posta",
        placeholder: "ornek@mail.com",
        required: true,
        halfWidth: true,
      }),
      createContactFormField("tel", {
        name: "phone",
        label: "Telefon",
        placeholder: "05xx xxx xx xx",
        halfWidth: true,
      }),
      createContactFormField("text", {
        name: "subject",
        label: "Konu",
        placeholder: "Mesaj konusu",
        required: true,
        halfWidth: true,
      }),
      createContactFormField("textarea", {
        name: "message",
        label: "Mesajınız",
        placeholder: "Mesajınızı yazın…",
        required: true,
        rows: 6,
      }),
    ],
  };
}

function isFieldType(value: unknown): value is ContactFormFieldType {
  return (
    typeof value === "string" &&
    (CONTACT_FORM_FIELD_TYPES as readonly string[]).includes(value)
  );
}

function parseOptions(raw: unknown): ContactFormFieldOption[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const options = raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const label = typeof row.label === "string" ? row.label.trim().slice(0, 120) : "";
      const value =
        typeof row.value === "string"
          ? row.value.trim().slice(0, 120)
          : slugifyName(label);
      if (!label || !value) return null;
      return { label, value };
    })
    .filter((item): item is ContactFormFieldOption => Boolean(item));
  return options.length > 0 ? options.slice(0, 30) : undefined;
}

export function parseContactFormField(raw: unknown): ContactFormField | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  if (!isFieldType(obj.type)) return null;

  const label =
    typeof obj.label === "string" && obj.label.trim()
      ? obj.label.trim().slice(0, 120)
      : "Alan";
  const nameRaw =
    typeof obj.name === "string" && obj.name.trim()
      ? slugifyName(obj.name)
      : slugifyName(label);
  const name = nameRaw || obj.type;

  const field: ContactFormField = {
    id:
      typeof obj.id === "string" && obj.id.trim()
        ? obj.id.trim().slice(0, 40)
        : createContactFormFieldId(),
    type: obj.type,
    name,
    label,
    required: obj.required === true,
    halfWidth: obj.halfWidth === true,
  };

  if (typeof obj.placeholder === "string" && obj.placeholder.trim()) {
    field.placeholder = obj.placeholder.trim().slice(0, 160);
  }
  if (typeof obj.helpText === "string" && obj.helpText.trim()) {
    field.helpText = obj.helpText.trim().slice(0, 240);
  }
  if (typeof obj.defaultValue === "string" && obj.defaultValue.trim()) {
    field.defaultValue = obj.defaultValue.trim().slice(0, 500);
  }
  if (typeof obj.rows === "number" && Number.isFinite(obj.rows)) {
    field.rows = Math.max(2, Math.min(20, Math.round(obj.rows)));
  }
  const options = parseOptions(obj.options);
  if (options) field.options = options;

  return field;
}

export function parseContactFormConfig(raw: unknown): ContactFormConfig | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const obj = raw as Record<string, unknown>;
  const defaults = getDefaultContactFormConfig();

  const fieldsRaw = Array.isArray(obj.fields) ? obj.fields : [];
  const fields = fieldsRaw
    .map(parseContactFormField)
    .filter((item): item is ContactFormField => Boolean(item))
    .slice(0, 40);

  return {
    submitLabel:
      typeof obj.submitLabel === "string" && obj.submitLabel.trim()
        ? obj.submitLabel.trim().slice(0, 80)
        : defaults.submitLabel,
    successMessage:
      typeof obj.successMessage === "string" && obj.successMessage.trim()
        ? obj.successMessage.trim().slice(0, 300)
        : defaults.successMessage,
    introHtml:
      typeof obj.introHtml === "string" && obj.introHtml.trim()
        ? obj.introHtml.trim().slice(0, 5000)
        : undefined,
    fields: fields.length > 0 ? fields : defaults.fields,
  };
}

export function parseContactFormFieldsJson(raw: string | null | undefined): ContactFormField[] {
  if (!raw?.trim()) return getDefaultContactFormConfig().fields;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return getDefaultContactFormConfig().fields;
    const fields = parsed
      .map(parseContactFormField)
      .filter((item): item is ContactFormField => Boolean(item))
      .slice(0, 40);
    return fields.length > 0 ? fields : getDefaultContactFormConfig().fields;
  } catch {
    return getDefaultContactFormConfig().fields;
  }
}

export function fieldNeedsOptions(type: ContactFormFieldType) {
  return type === "select" || type === "radio";
}
