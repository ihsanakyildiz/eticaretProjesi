export type ContactInfoBlockConfig = {
  showEmail: boolean;
  showPhone: boolean;
  showWhatsapp: boolean;
  showAddress: boolean;
  showWorkingHours: boolean;
  showMap: boolean;
  introText?: string;
};

export function getDefaultContactInfoBlockConfig(): ContactInfoBlockConfig {
  return {
    showEmail: true,
    showPhone: true,
    showWhatsapp: false,
    showAddress: true,
    showWorkingHours: false,
    showMap: false,
    introText: "Formu doldurabilir veya doğrudan bize ulaşabilirsiniz.",
  };
}

export function parseContactInfoBlockConfig(
  raw: unknown,
): ContactInfoBlockConfig | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const obj = raw as Record<string, unknown>;
  const defaults = getDefaultContactInfoBlockConfig();

  return {
    showEmail: typeof obj.showEmail === "boolean" ? obj.showEmail : defaults.showEmail,
    showPhone: typeof obj.showPhone === "boolean" ? obj.showPhone : defaults.showPhone,
    showWhatsapp:
      typeof obj.showWhatsapp === "boolean" ? obj.showWhatsapp : defaults.showWhatsapp,
    showAddress:
      typeof obj.showAddress === "boolean" ? obj.showAddress : defaults.showAddress,
    showWorkingHours:
      typeof obj.showWorkingHours === "boolean"
        ? obj.showWorkingHours
        : defaults.showWorkingHours,
    showMap: typeof obj.showMap === "boolean" ? obj.showMap : defaults.showMap,
    introText:
      typeof obj.introText === "string" && obj.introText.trim()
        ? obj.introText.trim().slice(0, 300)
        : defaults.introText,
  };
}
