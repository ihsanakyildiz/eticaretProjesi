"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { AdminSwitch } from "@/components/admin/admin-switch";
import { SmtpSettingsPanel } from "@/components/admin/smtp-settings-panel";
import { FileUp, ImageIcon, Loader2, Save, Trash2, Upload } from "lucide-react";
import {
  settingGroups,
  type SettingFieldDef,
  type SettingGroupDef,
  type SettingsScope,
} from "@/config/settings";
import { saveSettingsAction, type SettingsFormState } from "./actions";

const initialState: SettingsFormState = {};

function ImageUploadField({
  field,
  value,
}: {
  field: SettingFieldDef;
  value: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(value || "");
  const [fileName, setFileName] = useState("");

  useEffect(() => {
    setPreview(value || "");
  }, [value]);

  return (
    <div className="space-y-3">
      <input type="hidden" name={field.key} value={preview} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-[#e9ebec] bg-[#f3f6f9]">
          {preview && field.type === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt={field.label} className="h-full w-full object-contain p-2" />
          ) : (
            <ImageIcon className="h-7 w-7 text-slate-300" />
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-md border border-[#e9ebec] bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <Upload className="h-4 w-4" />
              Dosya Seç
            </button>
            {preview ? (
              <button
                type="button"
                onClick={() => {
                  setPreview("");
                  setFileName("");
                  if (inputRef.current) inputRef.current.value = "";
                }}
                className="inline-flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-100"
              >
                <Trash2 className="h-4 w-4" />
                Kaldır
              </button>
            ) : null}
          </div>

          <input
            ref={inputRef}
            id={`${field.key}_file`}
            name={`${field.key}_file`}
            type="file"
            accept={field.accept}
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              setFileName(file.name);
              if (file.type.startsWith("image/")) {
                const url = URL.createObjectURL(file);
                setPreview(url);
              } else {
                setPreview(field.defaultValue || `/${field.fixedFileName || file.name}`);
              }
            }}
          />

          <p className="truncate text-xs text-slate-500">
            {fileName
              ? `Seçildi: ${fileName}`
              : preview
                ? `Mevcut: ${preview}`
                : "Henüz dosya yüklenmedi"}
          </p>
          {field.recommendedSize ? (
            <p className="text-xs text-slate-400">{field.recommendedSize}</p>
          ) : null}
          {field.type === "image" ? (
            <p className="text-xs text-[#0ab39c]">
              Kayıtta otomatik optimize edilir
              {field.imageMode === "favicon"
                ? " (PNG + WebP)."
                : field.accept?.includes("svg")
                  ? " (WebP; SVG korunur)."
                  : " (WebP)."}{" "}
              Değiştirme / kaldırmada eski dosya silinir.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function FileUploadField({
  field,
  value,
}: {
  field: SettingFieldDef;
  value: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [current, setCurrent] = useState(value || "");
  const [fileName, setFileName] = useState("");

  useEffect(() => {
    setCurrent(value || "");
  }, [value]);

  return (
    <div className="space-y-2">
      <input type="hidden" name={field.key} value={current} />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-md border border-[#e9ebec] bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          <FileUp className="h-4 w-4" />
          Manifest Yükle
        </button>
        {current ? (
          <a
            href={current}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center rounded-md border border-[#e9ebec] px-3 py-2 text-sm text-[#405189] hover:bg-slate-50"
          >
            Mevcut dosyayı aç
          </a>
        ) : null}
      </div>
      <input
        ref={inputRef}
        id={`${field.key}_file`}
        name={`${field.key}_file`}
        type="file"
        accept={field.accept}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          setFileName(file.name);
          setCurrent(field.defaultValue || `/${field.fixedFileName || file.name}`);
        }}
      />
      <p className="text-xs text-slate-500">
        {fileName
          ? `Seçildi: ${fileName}`
          : current
            ? `Mevcut: ${current}`
            : "Yüklenmezse kaydetmede otomatik oluşturulur"}
      </p>
    </div>
  );
}

function FieldInput({
  field,
  value,
}: {
  field: SettingFieldDef;
  value: string;
}) {
  const baseClass =
    "w-full rounded-md border border-[#e9ebec] bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#0ab39c] focus:ring-2 focus:ring-[#0ab39c]/20";

  if (field.type === "image") {
    return <ImageUploadField field={field} value={value} />;
  }

  if (field.type === "file") {
    return <FileUploadField field={field} value={value} />;
  }

  if (field.type === "textarea") {
    return (
      <textarea
        id={field.key}
        name={field.key}
        rows={field.rows ?? 3}
        defaultValue={value}
        placeholder={field.placeholder}
        spellCheck={field.codeEditor ? false : undefined}
        className={`${baseClass} resize-y ${
          field.codeEditor ? "font-mono text-[13px] leading-relaxed" : ""
        }`}
      />
    );
  }

  if (field.type === "boolean") {
    return (
      <AdminSwitch
        name={field.key}
        label={field.label}
        description={field.hint}
        defaultChecked={value === "true"}
      />
    );
  }

  if (field.type === "password") {
    const hasStored = Boolean(value);
    return (
      <div className="space-y-1.5">
        <input
          id={field.key}
          name={field.key}
          type="password"
          autoComplete="new-password"
          defaultValue=""
          placeholder={
            hasStored
              ? "Kayıtlı şifre korunuyor — değiştirmek için yazın"
              : field.placeholder || "SMTP şifresi"
          }
          className={baseClass}
        />
        {hasStored ? (
          <p className="text-xs text-emerald-600">Kayıtlı bir SMTP şifresi var.</p>
        ) : null}
      </div>
    );
  }

  if (field.type === "number") {
    return (
      <input
        id={field.key}
        name={field.key}
        type="number"
        defaultValue={value}
        placeholder={field.placeholder}
        min={field.min}
        max={field.max}
        className={baseClass}
      />
    );
  }

  return (
    <input
      id={field.key}
      name={field.key}
      type={field.type === "url" || field.type === "email" || field.type === "tel" ? field.type : "text"}
      defaultValue={value}
      placeholder={field.placeholder}
      readOnly={field.readOnly}
      className={
        field.readOnly
          ? `${baseClass} cursor-default bg-slate-50 text-slate-700 focus:border-[#e9ebec] focus:ring-0`
          : baseClass
      }
    />
  );
}

type SettingsFormProps = {
  values: Record<string, string>;
  groups?: SettingGroupDef[];
  scope?: SettingsScope;
  submitLabel?: string;
};

export function SettingsForm({
  values,
  groups = settingGroups,
  scope = "general",
  submitLabel = "Ayarları Kaydet",
}: SettingsFormProps) {
  const [state, formAction, isPending] = useActionState(saveSettingsAction, initialState);

  useEffect(() => {
    if (state.success && state.message) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [state]);

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="_settings_scope" value={scope} />

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

      {groups.map((group) => (
        <section
          key={group.id}
          id={group.id}
          className="rounded-lg border border-[#e9ebec] bg-white shadow-sm"
        >
          <div className="border-b border-[#e9ebec] px-5 py-4">
            <h2 className="text-base font-semibold text-slate-800">{group.title}</h2>
            <p className="mt-1 text-sm text-slate-500">{group.description}</p>
          </div>

          <div className={group.id === "mail" ? "p-5" : "grid gap-5 p-5 md:grid-cols-2"}>
            {group.id === "mail" ? (
              <SmtpSettingsPanel values={values} />
            ) : (
              group.fields.map((field) => (
                <div
                  key={field.key}
                  className={
                    field.type === "textarea" ||
                    field.type === "image" ||
                    field.type === "file" ||
                    field.codeEditor
                      ? "md:col-span-2"
                      : undefined
                  }
                >
                  {field.type !== "boolean" ? (
                    <label
                      htmlFor={field.key}
                      className="mb-1.5 block text-sm font-medium text-slate-700"
                    >
                      {field.label}
                    </label>
                  ) : null}
                  <FieldInput field={field} value={values[field.key] ?? field.defaultValue ?? ""} />
                  {field.hint && field.type !== "boolean" ? (
                    <p
                      className={`mt-1.5 text-xs leading-relaxed text-slate-400 ${
                        field.hint.trim().startsWith("<") ? "break-all font-mono text-[11px]" : ""
                      }`}
                    >
                      {field.hint}
                    </p>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </section>
      ))}

      <div className="sticky bottom-4 z-10 flex justify-end">
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
              {submitLabel}
            </>
          )}
        </button>
      </div>
    </form>
  );
}
