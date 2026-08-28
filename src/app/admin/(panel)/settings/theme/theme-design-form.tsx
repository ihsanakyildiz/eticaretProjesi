"use client";

import { useActionState, useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Palette, RotateCcw, Save, Sun, Moon, Monitor } from "lucide-react";
import { ThemeColorField } from "@/components/admin/theme-color-field";
import {
  THEME_COLOR_FIELDS,
  THEME_DEFAULTS,
  THEME_PRESETS,
  presetToSettings,
  tokenKey,
  type ThemeColorTokens,
  type ThemeFont,
  type ThemeMode,
  type ThemeRadius,
} from "@/config/theme-settings";
import { buildSiteThemeCss } from "@/lib/site-theme";
import { saveSettingsAction, type SettingsFormState } from "../actions";

const initialState: SettingsFormState = {};

type ThemeDesignFormProps = {
  values: Record<string, string>;
};

function readFormValues(values: Record<string, string>) {
  return { ...THEME_DEFAULTS, ...values };
}

function ThemePreview({
  light,
  dark,
  previewMode,
  radius,
  font,
}: {
  light: ThemeColorTokens;
  dark: ThemeColorTokens;
  previewMode: "light" | "dark";
  radius: ThemeRadius;
  font: ThemeFont;
}) {
  const css = buildSiteThemeCss({
    theme_radius: radius,
    theme_font: font,
    ...Object.fromEntries(
      THEME_COLOR_FIELDS.flatMap((field) => [
        [tokenKey("light", field.key), light[field.key]],
        [tokenKey("dark", field.key), dark[field.key]],
      ]),
    ),
  });

  const tokens = previewMode === "dark" ? dark : light;

  return (
    <div className="overflow-hidden rounded-xl border border-[#e9ebec] shadow-sm">
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div
        className={`site-shell p-5 ${previewMode === "dark" ? "site-dark" : ""}`}
        style={{
          background: tokens.bg,
          color: tokens.fg,
          fontFamily:
            font === "geist"
              ? "var(--font-geist-sans), system-ui, sans-serif"
              : font === "system"
                ? "system-ui, sans-serif"
                : "var(--font-plus-jakarta), system-ui, sans-serif",
        }}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div
              className="h-8 w-8 rounded-md"
              style={{ background: tokens.primary, borderRadius: "var(--site-radius)" }}
            />
            <span className="text-sm font-semibold">Site Önizleme</span>
          </div>
          <span
            className="rounded-full px-2.5 py-1 text-xs font-medium"
            style={{
              background: tokens.primarySoft,
              color: tokens.primary,
              borderRadius: "9999px",
            }}
          >
            {previewMode === "dark" ? "Koyu mod" : "Açık mod"}
          </span>
        </div>

        <div
          className="mb-4 rounded-lg border p-4"
          style={{
            background: tokens.surface,
            borderColor: tokens.border,
            borderRadius: "calc(var(--site-radius) * 1.5)",
          }}
        >
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: tokens.muted }}>
            Hero başlık
          </p>
          <h3 className="mt-1 text-lg font-bold">
            Markanızı{" "}
            <span style={{ color: tokens.primary }}>birlikte yükseltelim</span>
          </h3>
          <p className="mt-1 text-sm" style={{ color: tokens.muted }}>
            Web tasarım ve dijital çözümlerle işinizi büyütün.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span
              className="inline-flex px-4 py-2 text-sm font-semibold text-white"
              style={{
                background: tokens.primary,
                borderRadius: "var(--site-radius)",
              }}
            >
              Başlayın
            </span>
            <span
              className="inline-flex border px-4 py-2 text-sm font-medium"
              style={{
                borderColor: tokens.border,
                color: tokens.fg,
                borderRadius: "var(--site-radius)",
              }}
            >
              Projeler
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[1, 2].map((item) => (
            <div
              key={item}
              className="rounded-lg border p-3"
              style={{
                background: tokens.card,
                borderColor: tokens.border,
                borderRadius: "var(--site-radius)",
              }}
            >
              <div
                className="mb-2 h-2 w-8 rounded"
                style={{ background: tokens.primary, opacity: 0.7 }}
              />
              <p className="text-sm font-semibold">Kart {item}</p>
              <p className="mt-0.5 text-xs" style={{ color: tokens.muted }}>
                Örnek içerik kartı
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ThemeDesignForm({ values }: ThemeDesignFormProps) {
  const merged = useMemo(() => readFormValues(values), [values]);
  const [state, formAction, isPending] = useActionState(saveSettingsAction, initialState);
  const [formValues, setFormValues] = useState(merged);
  const [colorTab, setColorTab] = useState<"light" | "dark">("light");
  const [previewMode, setPreviewMode] = useState<"light" | "dark">("light");

  useEffect(() => {
    setFormValues(readFormValues(values));
  }, [values]);

  useEffect(() => {
    if (state.success && state.message) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [state]);

  const applyPreset = useCallback((presetId: string) => {
    const preset = THEME_PRESETS.find((item) => item.id === presetId);
    if (!preset) return;
    setFormValues((current) => ({
      ...current,
      ...presetToSettings(preset),
    }));
  }, []);

  const updateField = useCallback((key: string, value: string) => {
    setFormValues((current) => ({ ...current, [key]: value }));
  }, []);

  const resetDefaults = useCallback(() => {
    setFormValues({ ...THEME_DEFAULTS });
  }, []);

  const lightTokens = useMemo(() => {
    const tokens = {} as ThemeColorTokens;
    for (const field of THEME_COLOR_FIELDS) {
      tokens[field.key] =
        formValues[tokenKey("light", field.key)] ?? THEME_DEFAULTS[tokenKey("light", field.key)]!;
    }
    return tokens;
  }, [formValues]);

  const darkTokens = useMemo(() => {
    const tokens = {} as ThemeColorTokens;
    for (const field of THEME_COLOR_FIELDS) {
      tokens[field.key] =
        formValues[tokenKey("dark", field.key)] ?? THEME_DEFAULTS[tokenKey("dark", field.key)]!;
    }
    return tokens;
  }, [formValues]);

  const activePreset = formValues.theme_preset || "violet";
  const defaultMode = (formValues.theme_default_mode || "light") as ThemeMode;
  const radius = (formValues.theme_radius || "md") as ThemeRadius;
  const font = (formValues.theme_font || "plus-jakarta") as ThemeFont;

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="_settings_scope" value="theme" />
      <input type="hidden" name="theme_preset" value={activePreset} />
      <input type="hidden" name="theme_default_mode" value={defaultMode} />
      <input type="hidden" name="theme_radius" value={radius} />
      <input type="hidden" name="theme_font" value={font} />

      {state.error ? (
        <div
          role="alert"
          className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
        >
          {state.error}
        </div>
      ) : null}

      {state.success ? (
        <div
          role="status"
          className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
        >
          {state.message}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <section className="rounded-lg border border-[#e9ebec] bg-white shadow-sm">
            <div className="border-b border-[#e9ebec] px-5 py-4">
              <h2 className="text-base font-semibold text-slate-800">Hazır Temalar</h2>
              <p className="mt-1 text-sm text-slate-500">
                Bir preset seçerek renk paletini hızlıca uygulayın; ardından tek tek
                özelleştirebilirsiniz.
              </p>
            </div>
            <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
              {THEME_PRESETS.map((preset) => {
                const selected = activePreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyPreset(preset.id)}
                    className={`rounded-lg border p-4 text-left transition ${
                      selected
                        ? "border-[#0ab39c] bg-[#0ab39c]/5 ring-2 ring-[#0ab39c]/20"
                        : "border-[#e9ebec] bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="h-10 w-10 shrink-0 rounded-lg border border-black/5 shadow-inner"
                        style={{ background: preset.swatch }}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800">{preset.name}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{preset.description}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-lg border border-[#e9ebec] bg-white shadow-sm">
            <div className="border-b border-[#e9ebec] px-5 py-4">
              <h2 className="text-base font-semibold text-slate-800">Genel Ayarlar</h2>
              <p className="mt-1 text-sm text-slate-500">
                Varsayılan görünüm modu, köşe yuvarlaklığı ve site yazı tipi
              </p>
            </div>
            <div className="grid gap-5 p-5 md:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Varsayılan Tema Modu
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { value: "light", label: "Açık", icon: Sun },
                      { value: "dark", label: "Koyu", icon: Moon },
                      { value: "system", label: "Sistem", icon: Monitor },
                    ] as const
                  ).map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => updateField("theme_default_mode", option.value)}
                      className={`inline-flex flex-col items-center gap-1 rounded-md border px-2 py-2.5 text-xs font-medium transition ${
                        defaultMode === option.value
                          ? "border-[#0ab39c] bg-[#0ab39c]/10 text-[#0ab39c]"
                          : "border-[#e9ebec] text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <option.icon className="h-4 w-4" />
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Köşe Yuvarlaklığı
                </label>
                <select
                  value={radius}
                  onChange={(event) => updateField("theme_radius", event.target.value)}
                  className="w-full rounded-md border border-[#e9ebec] bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-[#0ab39c] focus:ring-2 focus:ring-[#0ab39c]/20"
                >
                  <option value="sm">Küçük (6px)</option>
                  <option value="md">Orta (8px)</option>
                  <option value="lg">Büyük (12px)</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Site Yazı Tipi
                </label>
                <select
                  value={font}
                  onChange={(event) => updateField("theme_font", event.target.value)}
                  className="w-full rounded-md border border-[#e9ebec] bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-[#0ab39c] focus:ring-2 focus:ring-[#0ab39c]/20"
                >
                  <option value="plus-jakarta">Plus Jakarta Sans</option>
                  <option value="geist">Geist Sans</option>
                  <option value="system">Sistem yazı tipi</option>
                </select>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-[#e9ebec] bg-white shadow-sm">
            <div className="border-b border-[#e9ebec] px-5 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-800">Renk Paleti</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Açık ve koyu mod için ayrı renk setleri tanımlayın
                  </p>
                </div>
                <div className="inline-flex rounded-lg border border-[#e9ebec] bg-slate-50 p-1">
                  <button
                    type="button"
                    onClick={() => setColorTab("light")}
                    className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                      colorTab === "light"
                        ? "bg-white text-slate-800 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    <Sun className="h-4 w-4" />
                    Açık
                  </button>
                  <button
                    type="button"
                    onClick={() => setColorTab("dark")}
                    className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                      colorTab === "dark"
                        ? "bg-white text-slate-800 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    <Moon className="h-4 w-4" />
                    Koyu
                  </button>
                </div>
              </div>
            </div>
            <div className="grid gap-5 p-5 md:grid-cols-2">
              {THEME_COLOR_FIELDS.map((field) => {
                const key = tokenKey(colorTab, field.key);
                return (
                  <ThemeColorField
                    key={key}
                    id={key}
                    name={key}
                    label={field.label}
                    hint={field.hint}
                    value={formValues[key] ?? ""}
                    onChange={(value) => updateField(key, value)}
                  />
                );
              })}
            </div>
          </section>
        </div>

        <div className="space-y-4 xl:sticky xl:top-4 xl:self-start">
          <div className="rounded-lg border border-[#e9ebec] bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">Canlı Önizleme</p>
              <div className="inline-flex rounded-md border border-[#e9ebec] p-0.5">
                <button
                  type="button"
                  onClick={() => setPreviewMode("light")}
                  className={`rounded px-2 py-1 text-xs ${previewMode === "light" ? "bg-slate-100 font-medium" : "text-slate-500"}`}
                >
                  Açık
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode("dark")}
                  className={`rounded px-2 py-1 text-xs ${previewMode === "dark" ? "bg-slate-800 font-medium text-white" : "text-slate-500"}`}
                >
                  Koyu
                </button>
              </div>
            </div>
            <ThemePreview
              light={lightTokens}
              dark={darkTokens}
              previewMode={previewMode}
              radius={radius}
              font={font}
            />
          </div>

          <div className="rounded-lg border border-[#e9ebec] bg-[#f8fafc] p-4 text-xs leading-relaxed text-slate-500">
            <p className="font-medium text-slate-700">İpucu</p>
            <p className="mt-1">
              Renkler tüm site genelinde otomatik uygulanır — butonlar, kartlar, linkler ve
              hero bölümleri dahil. Hero slayt renkleri ayrıca slayt düzenleme ekranından
              özelleştirilebilir.
            </p>
          </div>
        </div>
      </div>

      <div className="sticky bottom-4 z-10 flex flex-wrap justify-end gap-3">
        <button
          type="button"
          onClick={resetDefaults}
          className="inline-flex items-center gap-2 rounded-md border border-[#e9ebec] bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <RotateCcw className="h-4 w-4" />
          Varsayılana Sıfırla
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-md bg-[#0ab39c] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#0ab39c]/25 transition hover:bg-[#099885] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Kaydediliyor...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Tema Ayarlarını Kaydet
            </>
          )}
        </button>
      </div>
    </form>
  );
}
