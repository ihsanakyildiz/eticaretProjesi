import {
  DEFAULT_THEME_DARK,
  DEFAULT_THEME_LIGHT,
  THEME_COLOR_FIELDS,
  THEME_DEFAULTS,
  type ThemeColorTokens,
  type ThemeFont,
  type ThemeMode,
  type ThemeRadius,
  tokenKey,
} from "@/config/theme-settings";

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const RGBA_RE =
  /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*(0|1|0?\.\d+))?\s*\)$/;

export function isValidThemeColor(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (HEX_RE.test(trimmed)) return true;
  const rgba = trimmed.match(RGBA_RE);
  if (!rgba) return false;
  const [, r, g, b, a] = rgba;
  const channels = [r, g, b].map((item) => Number.parseInt(item!, 10));
  if (channels.some((item) => item < 0 || item > 255)) return false;
  if (a !== undefined) {
    const alpha = Number.parseFloat(a);
    if (!Number.isFinite(alpha) || alpha < 0 || alpha > 1) return false;
  }
  return true;
}

export function sanitizeThemeColor(value: string, fallback: string): string {
  const trimmed = value.trim();
  return isValidThemeColor(trimmed) ? trimmed : fallback;
}

function readTokens(
  settings: Record<string, string>,
  mode: "light" | "dark",
  defaults: ThemeColorTokens,
): ThemeColorTokens {
  const tokens = { ...defaults };
  for (const field of THEME_COLOR_FIELDS) {
    const key = tokenKey(mode, field.key);
    const raw = settings[key];
    if (raw !== undefined && raw !== "") {
      tokens[field.key] = sanitizeThemeColor(raw, defaults[field.key]);
    }
  }
  return tokens;
}

export function parseThemeMode(value?: string): ThemeMode {
  if (value === "dark" || value === "system") return value;
  return "light";
}

export function parseThemeRadius(value?: string): ThemeRadius {
  if (value === "sm" || value === "lg") return value;
  return "md";
}

export function parseThemeFont(value?: string): ThemeFont {
  if (value === "geist" || value === "system") return value;
  return "plus-jakarta";
}

const RADIUS_MAP: Record<ThemeRadius, string> = {
  sm: "0.375rem",
  md: "0.5rem",
  lg: "0.75rem",
};

const FONT_MAP: Record<ThemeFont, string> = {
  "plus-jakarta":
    "var(--font-plus-jakarta), var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
  geist: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
  system: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

export type ResolvedSiteTheme = {
  preset: string;
  defaultMode: ThemeMode;
  radius: ThemeRadius;
  font: ThemeFont;
  light: ThemeColorTokens;
  dark: ThemeColorTokens;
};

export function resolveSiteTheme(settings: Record<string, string>): ResolvedSiteTheme {
  return {
    preset: settings.theme_preset || THEME_DEFAULTS.theme_preset!,
    defaultMode: parseThemeMode(settings.theme_default_mode),
    radius: parseThemeRadius(settings.theme_radius),
    font: parseThemeFont(settings.theme_font),
    light: readTokens(settings, "light", DEFAULT_THEME_LIGHT),
    dark: readTokens(settings, "dark", DEFAULT_THEME_DARK),
  };
}

function cssBlock(selector: string, tokens: ThemeColorTokens, radius: string, font: string) {
  return `${selector}{
  --site-bg:${tokens.bg};
  --site-fg:${tokens.fg};
  --site-muted:${tokens.muted};
  --site-primary:${tokens.primary};
  --site-primary-soft:${tokens.primarySoft};
  --site-border:${tokens.border};
  --site-card:${tokens.card};
  --site-surface:${tokens.surface};
  --site-glow-a:${tokens.glowA};
  --site-glow-b:${tokens.glowB};
  --site-radius:${radius};
  --site-font:${font};
}`;
}

export function buildSiteThemeCss(settings: Record<string, string>): string {
  const theme = resolveSiteTheme(settings);
  const radius = RADIUS_MAP[theme.radius];
  const font = FONT_MAP[theme.font];

  return [
    cssBlock(":root", theme.light, radius, font),
    cssBlock("html.site-dark", theme.dark, radius, font),
    `.site-shell{font-family:var(--site-font);}`,
    `.site-themed-radius{border-radius:var(--site-radius);}`,
    `.site-themed-radius-lg{border-radius:calc(var(--site-radius)*1.5);}`,
  ].join("\n");
}

export function getThemeDefaultModeScript(defaultMode: ThemeMode): string {
  const mode = defaultMode === "system" ? "system" : defaultMode;
  return `(function(){try{var a=localStorage.getItem('admin-theme');if(a==='dark'){document.documentElement.classList.add('admin-dark');document.documentElement.dataset.adminTheme='dark';}else{document.documentElement.dataset.adminTheme='light';}var stored=localStorage.getItem('site-theme');var def='${mode}';var resolved=stored;if(!resolved){if(def==='system'){resolved=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}else{resolved=def;}}if(resolved==='dark'){document.documentElement.classList.add('site-dark');document.documentElement.dataset.siteTheme='dark';}else{document.documentElement.dataset.siteTheme='light';}}catch(e){}})();`;
}
