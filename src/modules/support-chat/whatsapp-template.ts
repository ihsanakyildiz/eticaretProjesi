export type WhatsAppTemplateVar = {
  id: string;
  component: "header" | "body" | "button";
  slot: string;
  named: boolean;
  index: number;
  label: string;
  hint: string;
  example: string;
};

export type WhatsAppTemplateView = {
  id: string;
  name: string;
  language: string;
  category: string;
  headerText: string;
  headerFormat: "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT" | "NONE";
  bodyText: string;
  footerText: string;
  variables: WhatsAppTemplateVar[];
  sendable: boolean;
  sendableHint: string;
};

const SLOT_RE = /\{\{([a-zA-Z0-9_]+)\}\}/g;

export function normalizeWhatsAppTo(raw: string) {
  let digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = `90${digits.slice(1)}`;
  if (digits.length === 10 && digits.startsWith("5")) digits = `90${digits}`;
  if (digits.length < 10 || digits.length > 15) return null;
  return digits;
}

export function whatsappTemplateOptionLabel(template: WhatsAppTemplateView) {
  return `${template.name} (${template.language})`;
}

function slotsIn(text: string) {
  const found: string[] = [];
  const seen = new Set<string>();
  SLOT_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = SLOT_RE.exec(text))) {
    const slot = match[1];
    if (!slot || seen.has(slot)) continue;
    seen.add(slot);
    found.push(slot);
  }
  return found;
}

function hintAround(text: string, slot: string) {
  const token = `{{${slot}}}`;
  const at = text.indexOf(token);
  if (at < 0) return "";
  const before = text.slice(Math.max(0, at - 36), at).replace(/\s+/g, " ").trim();
  const after = text.slice(at + token.length, at + token.length + 36).replace(/\s+/g, " ").trim();
  if (before && after) return `Metindeki yeri: …${before} {{${slot}}} ${after}…`;
  if (before) return `Metindeki yeri: …${before} {{${slot}}}`;
  if (after) return `Metindeki yeri: {{${slot}}} ${after}…`;
  return "";
}

function valuesForComponent(
  template: WhatsAppTemplateView,
  component: "header" | "body",
  values: Record<string, string>,
) {
  const mapped: Record<string, string> = {};
  for (const item of template.variables) {
    if (item.component !== component) continue;
    mapped[item.slot] = values[item.id] ?? "";
  }
  return mapped;
}

function fillSlots(text: string, values: Record<string, string>) {
  return text.replace(SLOT_RE, (token, raw: string) => {
    const typed = values[raw]?.trim();
    return typed || token;
  });
}

export function fillWhatsAppTemplatePreview(template: WhatsAppTemplateView, values: Record<string, string>) {
  return {
    header: fillSlots(template.headerText, valuesForComponent(template, "header", values)),
    body: fillSlots(template.bodyText, valuesForComponent(template, "body", values)),
    footer: template.footerText,
  };
}

export function whatsappTemplateValuesComplete(template: WhatsAppTemplateView, values: Record<string, string>) {
  return template.variables.every((item) => Boolean(values[item.id]?.trim()));
}

function headerFormatOf(format: string | undefined): WhatsAppTemplateView["headerFormat"] {
  switch ((format ?? "TEXT").toUpperCase()) {
    case "TEXT":
      return "TEXT";
    case "IMAGE":
      return "IMAGE";
    case "VIDEO":
      return "VIDEO";
    case "DOCUMENT":
      return "DOCUMENT";
    default:
      return "TEXT";
  }
}

type NamedExample = { param_name?: string; example?: string };

function namedExample(list: NamedExample[] | undefined, slot: string) {
  return list?.find((item) => item.param_name === slot)?.example?.trim() || "";
}

function positionalExample(list: string[] | undefined, slot: string) {
  const index = Number(slot);
  if (!Number.isInteger(index) || index < 1) return "";
  return list?.[index - 1]?.trim() || "";
}

function pushVars(
  variables: WhatsAppTemplateVar[],
  component: "header" | "body",
  text: string,
  examples: { positional?: string[]; named?: NamedExample[] },
) {
  const section = component === "header" ? "Başlık" : "Gövde";
  slotsIn(text).forEach((slot, order) => {
    const named = !/^\d+$/.test(slot);
    const example = named
      ? namedExample(examples.named, slot)
      : positionalExample(examples.positional, slot) || namedExample(examples.named, slot);
    const around = hintAround(text, slot);
    variables.push({
      id: `${component}:${slot}`,
      component,
      slot,
      named,
      index: named ? order + 1 : Number(slot),
      label: `${section} {{${slot}}}`,
      hint: [around || `${section.toLowerCase()} değişkeni.`, example ? `Örnek: ${example}` : ""]
        .filter(Boolean)
        .join(" "),
      example,
    });
  });
}

export function buildWhatsAppTemplateView(input: {
  name: string;
  language: string;
  category?: string;
  components?: Array<{
    type?: string;
    format?: string;
    text?: string;
    example?: {
      header_text?: string[];
      body_text?: string[][];
      header_text_named_params?: NamedExample[];
      body_text_named_params?: NamedExample[];
    };
    buttons?: Array<{ type?: string; text?: string; url?: string }>;
  }>;
}): WhatsAppTemplateView {
  let headerText = "";
  let headerFormat: WhatsAppTemplateView["headerFormat"] = "NONE";
  let bodyText = "";
  let footerText = "";
  const variables: WhatsAppTemplateVar[] = [];
  const headerExample = input.components?.find((item) => item.type?.toUpperCase() === "HEADER")?.example;
  const bodyExample = input.components?.find((item) => item.type?.toUpperCase() === "BODY")?.example;

  for (const raw of input.components ?? []) {
    const type = (raw.type ?? "").toUpperCase();
    switch (type) {
      case "HEADER": {
        headerFormat = headerFormatOf(raw.format);
        headerText = raw.text?.trim() || "";
        if (headerFormat === "TEXT") {
          pushVars(variables, "header", headerText, {
            positional: headerExample?.header_text,
            named: headerExample?.header_text_named_params,
          });
        }
        break;
      }
      case "BODY": {
        bodyText = raw.text?.trim() || "";
        pushVars(variables, "body", bodyText, {
          positional: bodyExample?.body_text?.[0],
          named: bodyExample?.body_text_named_params,
        });
        break;
      }
      case "FOOTER":
        footerText = raw.text?.trim() || "";
        break;
      case "BUTTONS": {
        (raw.buttons ?? []).forEach((button, buttonIndex) => {
          const url = button.url ?? "";
          const slots = slotsIn(url);
          if (slots.length === 0) return;
          const slot = slots[0] ?? "1";
          variables.push({
            id: `button:${buttonIndex}`,
            component: "button",
            slot,
            named: !/^\d+$/.test(slot),
            index: buttonIndex,
            label: button.text ? `Buton: ${button.text}` : `Buton {{${slot}}}`,
            hint: `Bağlantıdaki {{${slot}}} eki. Tam URL’nin değişken kısmını yazın.`,
            example: "",
          });
        });
        break;
      }
      default:
        break;
    }
  }

  const mediaHeader = headerFormat === "IMAGE" || headerFormat === "VIDEO" || headerFormat === "DOCUMENT";
  return {
    id: `${input.name}:${input.language}`,
    name: input.name,
    language: input.language,
    category: input.category || "",
    headerText,
    headerFormat,
    bodyText,
    footerText,
    variables,
    sendable: !mediaHeader && Boolean(bodyText || headerText),
    sendableHint: mediaHeader
      ? "Bu şablonun başlığı görsel veya video. Metin şablonları ile konuşma başlatılabilir."
      : "",
  };
}
