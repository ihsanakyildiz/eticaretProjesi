import type { SettingGroupDef } from "@/config/settings";

export type ThemeMode = "light" | "dark" | "system";
export type ThemeRadius = "sm" | "md" | "lg";
export type ThemeFont = "plus-jakarta" | "geist" | "system";

export type ThemeColorTokens = {
  bg: string;
  fg: string;
  muted: string;
  primary: string;
  primarySoft: string;
  border: string;
  card: string;
  surface: string;
  glowA: string;
  glowB: string;
};

export type ThemePreset = {
  id: string;
  name: string;
  description: string;
  swatch: string;
  light: ThemeColorTokens;
  dark: ThemeColorTokens;
};

export const DEFAULT_THEME_LIGHT: ThemeColorTokens = {
  bg: "#ffffff",
  fg: "#0f172a",
  muted: "#64748b",
  primary: "#7c3aed",
  primarySoft: "#f3e8ff",
  border: "#e2e8f0",
  card: "#ffffff",
  surface: "#f8fafc",
  glowA: "rgba(124, 58, 237, 0.18)",
  glowB: "rgba(52, 211, 153, 0.14)",
};

export const DEFAULT_THEME_DARK: ThemeColorTokens = {
  bg: "#0b1220",
  fg: "#f1f5f9",
  muted: "#94a3b8",
  primary: "#a78bfa",
  primarySoft: "rgba(167, 139, 250, 0.14)",
  border: "#1e293b",
  card: "#111827",
  surface: "#0f172a",
  glowA: "rgba(167, 139, 250, 0.22)",
  glowB: "rgba(52, 211, 153, 0.1)",
};

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "violet",
    name: "Mor (Varsayılan)",
    description: "Marka moru — modern ve güven veren",
    swatch: "#7c3aed",
    light: DEFAULT_THEME_LIGHT,
    dark: DEFAULT_THEME_DARK,
  },
  {
    id: "ocean",
    name: "Okyanus",
    description: "Mavi-teal — kurumsal ve sakin",
    swatch: "#0284c7",
    light: {
      bg: "#ffffff",
      fg: "#0c4a6e",
      muted: "#64748b",
      primary: "#0284c7",
      primarySoft: "#e0f2fe",
      border: "#e2e8f0",
      card: "#ffffff",
      surface: "#f0f9ff",
      glowA: "rgba(2, 132, 199, 0.16)",
      glowB: "rgba(20, 184, 166, 0.12)",
    },
    dark: {
      bg: "#0a1628",
      fg: "#e0f2fe",
      muted: "#94a3b8",
      primary: "#38bdf8",
      primarySoft: "rgba(56, 189, 248, 0.12)",
      border: "#1e3a5f",
      card: "#0f2744",
      surface: "#0c1f38",
      glowA: "rgba(56, 189, 248, 0.2)",
      glowB: "rgba(45, 212, 191, 0.1)",
    },
  },
  {
    id: "forest",
    name: "Orman",
    description: "Yeşil tonlar — doğal ve dengeli",
    swatch: "#059669",
    light: {
      bg: "#ffffff",
      fg: "#14532d",
      muted: "#64748b",
      primary: "#059669",
      primarySoft: "#d1fae5",
      border: "#e2e8f0",
      card: "#ffffff",
      surface: "#f0fdf4",
      glowA: "rgba(5, 150, 105, 0.15)",
      glowB: "rgba(34, 197, 94, 0.12)",
    },
    dark: {
      bg: "#0a1410",
      fg: "#ecfdf5",
      muted: "#94a3b8",
      primary: "#34d399",
      primarySoft: "rgba(52, 211, 153, 0.12)",
      border: "#1a2e24",
      card: "#111f18",
      surface: "#0d1a14",
      glowA: "rgba(52, 211, 153, 0.18)",
      glowB: "rgba(74, 222, 128, 0.08)",
    },
  },
  {
    id: "rose",
    name: "Gül",
    description: "Pembe-kırmızı — enerjik ve yaratıcı",
    swatch: "#e11d48",
    light: {
      bg: "#ffffff",
      fg: "#881337",
      muted: "#64748b",
      primary: "#e11d48",
      primarySoft: "#ffe4e6",
      border: "#e2e8f0",
      card: "#ffffff",
      surface: "#fff1f2",
      glowA: "rgba(225, 29, 72, 0.14)",
      glowB: "rgba(244, 63, 94, 0.1)",
    },
    dark: {
      bg: "#140a0e",
      fg: "#ffe4e6",
      muted: "#94a3b8",
      primary: "#fb7185",
      primarySoft: "rgba(251, 113, 133, 0.12)",
      border: "#3f1720",
      card: "#1a0f14",
      surface: "#160c11",
      glowA: "rgba(251, 113, 133, 0.2)",
      glowB: "rgba(244, 63, 94, 0.08)",
    },
  },
  {
    id: "amber",
    name: "Kehribar",
    description: "Altın tonları — sıcak ve davetkar",
    swatch: "#d97706",
    light: {
      bg: "#ffffff",
      fg: "#78350f",
      muted: "#64748b",
      primary: "#d97706",
      primarySoft: "#fef3c7",
      border: "#e2e8f0",
      card: "#ffffff",
      surface: "#fffbeb",
      glowA: "rgba(217, 119, 6, 0.14)",
      glowB: "rgba(245, 158, 11, 0.1)",
    },
    dark: {
      bg: "#141008",
      fg: "#fef3c7",
      muted: "#94a3b8",
      primary: "#fbbf24",
      primarySoft: "rgba(251, 191, 36, 0.12)",
      border: "#3f2e12",
      card: "#1a1408",
      surface: "#161108",
      glowA: "rgba(251, 191, 36, 0.18)",
      glowB: "rgba(245, 158, 11, 0.08)",
    },
  },
  {
    id: "slate",
    name: "Arduvaz",
    description: "Nötr gri — minimal ve profesyonel",
    swatch: "#475569",
    light: {
      bg: "#ffffff",
      fg: "#0f172a",
      muted: "#64748b",
      primary: "#475569",
      primarySoft: "#f1f5f9",
      border: "#e2e8f0",
      card: "#ffffff",
      surface: "#f8fafc",
      glowA: "rgba(71, 85, 105, 0.12)",
      glowB: "rgba(148, 163, 184, 0.1)",
    },
    dark: {
      bg: "#0b0f14",
      fg: "#f1f5f9",
      muted: "#94a3b8",
      primary: "#94a3b8",
      primarySoft: "rgba(148, 163, 184, 0.12)",
      border: "#1e293b",
      card: "#111827",
      surface: "#0f172a",
      glowA: "rgba(148, 163, 184, 0.15)",
      glowB: "rgba(100, 116, 139, 0.08)",
    },
  },
];

export const THEME_COLOR_FIELDS: Array<{
  key: keyof ThemeColorTokens;
  label: string;
  hint?: string;
}> = [
  { key: "bg", label: "Arka plan" },
  { key: "fg", label: "Metin rengi" },
  { key: "muted", label: "Soluk metin" },
  { key: "primary", label: "Ana renk (primary)" },
  { key: "primarySoft", label: "Ana renk yumuşak", hint: "Buton hover, badge arka planı" },
  { key: "border", label: "Kenarlık" },
  { key: "card", label: "Kart arka planı" },
  { key: "surface", label: "Yüzey / bölüm arka planı" },
  { key: "glowA", label: "Parlama A", hint: "Hero gradient — rgba destekler" },
  { key: "glowB", label: "Parlama B", hint: "Hero gradient — rgba destekler" },
];

export function tokenKey(mode: "light" | "dark", token: keyof ThemeColorTokens) {
  return `theme_${mode}_${token}` as const;
}

export function tokensToSettings(
  light: ThemeColorTokens,
  dark: ThemeColorTokens,
  extra?: Record<string, string>,
): Record<string, string> {
  const map: Record<string, string> = { ...extra };
  for (const field of THEME_COLOR_FIELDS) {
    map[tokenKey("light", field.key)] = light[field.key];
    map[tokenKey("dark", field.key)] = dark[field.key];
  }
  return map;
}

export function presetToSettings(preset: ThemePreset): Record<string, string> {
  return tokensToSettings(preset.light, preset.dark, {
    theme_preset: preset.id,
    theme_default_mode: "light",
    theme_radius: "md",
    theme_font: "plus-jakarta",
  });
}

export const themeSettingGroups: SettingGroupDef[] = [
  {
    id: "theme_general",
    title: "Genel Tema",
    description: "Varsayılan görünüm modu, köşe yuvarlaklığı ve yazı tipi",
    fields: [
      {
        key: "theme_preset",
        label: "Aktif Preset",
        type: "text",
        defaultValue: "violet",
      },
      {
        key: "theme_default_mode",
        label: "Varsayılan Tema Modu",
        type: "text",
        defaultValue: "light",
        hint: "light | dark | system",
      },
      {
        key: "theme_radius",
        label: "Köşe Yuvarlaklığı",
        type: "text",
        defaultValue: "md",
        hint: "sm | md | lg",
      },
      {
        key: "theme_font",
        label: "Site Yazı Tipi",
        type: "text",
        defaultValue: "plus-jakarta",
        hint: "plus-jakarta | geist | system",
      },
    ],
  },
  {
    id: "theme_light",
    title: "Açık Tema Renkleri",
    description: "Gündüz / açık mod renk paleti",
    fields: THEME_COLOR_FIELDS.map((field) => ({
      key: tokenKey("light", field.key),
      label: field.label,
      type: "text" as const,
      defaultValue: DEFAULT_THEME_LIGHT[field.key],
      hint: field.hint,
    })),
  },
  {
    id: "theme_dark",
    title: "Koyu Tema Renkleri",
    description: "Gece / koyu mod renk paleti",
    fields: THEME_COLOR_FIELDS.map((field) => ({
      key: tokenKey("dark", field.key),
      label: field.label,
      type: "text" as const,
      defaultValue: DEFAULT_THEME_DARK[field.key],
      hint: field.hint,
    })),
  },
];

export const THEME_DEFAULTS = presetToSettings(THEME_PRESETS[0]!);
