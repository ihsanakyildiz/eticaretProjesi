"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
} from "lucide-react";
import {
  CONTACT_FORM_FIELD_TYPE_META,
  createContactFormField,
  fieldNeedsOptions,
  type ContactFormField,
  type ContactFormFieldType,
} from "@/config/contact-form";

type ContactFormFieldsEditorProps = {
  name?: string;
  initialFields: ContactFormField[];
};

const inputClass =
  "w-full rounded-md border border-[#e9ebec] bg-white px-2.5 py-1.5 text-sm outline-none focus:border-[#405189]";

export function ContactFormFieldsEditor({
  name = "contactFormFieldsJson",
  initialFields,
}: ContactFormFieldsEditorProps) {
  const [fields, setFields] = useState<ContactFormField[]>(initialFields);
  const [addType, setAddType] = useState<ContactFormFieldType>("text");
  const [expandedId, setExpandedId] = useState<string | null>(
    initialFields[0]?.id ?? null,
  );

  const json = useMemo(() => JSON.stringify(fields), [fields]);

  const updateField = (id: string, patch: Partial<ContactFormField>) => {
    setFields((current) =>
      current.map((field) => (field.id === id ? { ...field, ...patch } : field)),
    );
  };

  const moveField = (id: string, direction: -1 | 1) => {
    setFields((current) => {
      const index = current.findIndex((field) => field.id === id);
      if (index < 0) return current;
      const next = index + direction;
      if (next < 0 || next >= current.length) return current;
      const copy = [...current];
      const [item] = copy.splice(index, 1);
      copy.splice(next, 0, item!);
      return copy;
    });
  };

  const removeField = (id: string) => {
    setFields((current) => current.filter((field) => field.id !== id));
    setExpandedId((current) => (current === id ? null : current));
  };

  const addField = () => {
    const field = createContactFormField(addType);
    setFields((current) => [...current, field]);
    setExpandedId(field.id);
  };

  return (
    <div className="space-y-3 rounded-lg border border-[#e9ebec] bg-[#f8f9fb] p-4">
      <input type="hidden" name={name} value={json} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
            Form alanları
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Alan ekleyin, sırasını değiştirin ve her alanı özelleştirin.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={addType}
            onChange={(event) => setAddType(event.target.value as ContactFormFieldType)}
            className="rounded-md border border-[#e9ebec] bg-white px-2 py-1.5 text-sm"
          >
            {CONTACT_FORM_FIELD_TYPE_META.map((item) => (
              <option key={item.type} value={item.type}>
                {item.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={addField}
            className="inline-flex items-center gap-1.5 rounded-md bg-[#405189] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#364574]"
          >
            <Plus className="h-3.5 w-3.5" />
            Alan ekle
          </button>
        </div>
      </div>

      {fields.length === 0 ? (
        <p className="rounded-md border border-dashed border-[#d7dbe0] bg-white px-3 py-6 text-center text-sm text-slate-500">
          Henüz alan yok. Yukarıdan alan ekleyin.
        </p>
      ) : (
        <ul className="space-y-2">
          {fields.map((field, index) => {
            const open = expandedId === field.id;
            const typeLabel =
              CONTACT_FORM_FIELD_TYPE_META.find((item) => item.type === field.type)
                ?.label ?? field.type;

            return (
              <li
                key={field.id}
                className="overflow-hidden rounded-md border border-[#e9ebec] bg-white"
              >
                <div className="flex items-center gap-2 px-3 py-2">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => setExpandedId(open ? null : field.id)}
                  >
                    <span className="block truncate text-sm font-medium text-slate-800">
                      {field.label || "Adsız alan"}
                    </span>
                    <span className="block text-[11px] text-slate-400">
                      {typeLabel} · name: {field.name}
                      {field.required ? " · zorunlu" : ""}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="rounded p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-30"
                    onClick={() => moveField(field.id, -1)}
                    disabled={index === 0}
                    aria-label="Yukarı"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="rounded p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-30"
                    onClick={() => moveField(field.id, 1)}
                    disabled={index === fields.length - 1}
                    aria-label="Aşağı"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="rounded p-1 text-rose-400 hover:bg-rose-50 hover:text-rose-600"
                    onClick={() => removeField(field.id)}
                    aria-label="Sil"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {open ? (
                  <div className="space-y-3 border-t border-[#eef0f2] px-3 py-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-slate-600">
                          Alan tipi
                        </label>
                        <select
                          value={field.type}
                          onChange={(event) => {
                            const nextType = event.target.value as ContactFormFieldType;
                            const next = createContactFormField(nextType, {
                              id: field.id,
                              name: field.name,
                              label: field.label,
                              required: field.required,
                              halfWidth: field.halfWidth,
                              placeholder: field.placeholder,
                              helpText: field.helpText,
                            });
                            updateField(field.id, next);
                          }}
                          className={inputClass}
                        >
                          {CONTACT_FORM_FIELD_TYPE_META.map((item) => (
                            <option key={item.type} value={item.type}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-slate-600">
                          Etiket
                        </label>
                        <input
                          value={field.label}
                          onChange={(event) =>
                            updateField(field.id, { label: event.target.value })
                          }
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-slate-600">
                          Name (form anahtarı)
                        </label>
                        <input
                          value={field.name}
                          onChange={(event) =>
                            updateField(field.id, {
                              name: event.target.value
                                .toLowerCase()
                                .replace(/[^a-z0-9_]/g, "_"),
                            })
                          }
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-slate-600">
                          Placeholder
                        </label>
                        <input
                          value={field.placeholder ?? ""}
                          onChange={(event) =>
                            updateField(field.id, {
                              placeholder: event.target.value,
                            })
                          }
                          className={inputClass}
                          disabled={field.type === "checkbox" || field.type === "hidden"}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-slate-600">
                        Yardım metni
                      </label>
                      <input
                        value={field.helpText ?? ""}
                        onChange={(event) =>
                          updateField(field.id, { helpText: event.target.value })
                        }
                        className={inputClass}
                      />
                    </div>

                    {field.type === "textarea" ? (
                      <div className="max-w-[140px]">
                        <label className="mb-1 block text-[11px] font-medium text-slate-600">
                          Satır sayısı
                        </label>
                        <input
                          type="number"
                          min={2}
                          max={20}
                          value={field.rows ?? 5}
                          onChange={(event) =>
                            updateField(field.id, {
                              rows: Number.parseInt(event.target.value, 10) || 5,
                            })
                          }
                          className={inputClass}
                        />
                      </div>
                    ) : null}

                    {field.type === "hidden" ? (
                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-slate-600">
                          Varsayılan değer
                        </label>
                        <input
                          value={field.defaultValue ?? ""}
                          onChange={(event) =>
                            updateField(field.id, {
                              defaultValue: event.target.value,
                            })
                          }
                          className={inputClass}
                        />
                      </div>
                    ) : null}

                    {fieldNeedsOptions(field.type) ? (
                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-slate-600">
                          Seçenekler (her satır: Etiket|değer)
                        </label>
                        <textarea
                          rows={4}
                          value={(field.options ?? [])
                            .map((option) => `${option.label}|${option.value}`)
                            .join("\n")}
                          onChange={(event) => {
                            const options = event.target.value
                              .split("\n")
                              .map((line) => line.trim())
                              .filter(Boolean)
                              .map((line) => {
                                const [labelPart, ...rest] = line.split("|");
                                const label = (labelPart ?? "").trim();
                                const value =
                                  rest.join("|").trim() ||
                                  label
                                    .toLowerCase()
                                    .replace(/[^a-z0-9]+/g, "_");
                                return { label, value };
                              })
                              .filter((option) => option.label);
                            updateField(field.id, { options });
                          }}
                          className={inputClass}
                        />
                      </div>
                    ) : null}

                    <div className="flex flex-wrap gap-4 text-sm text-slate-700">
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={Boolean(field.required)}
                          onChange={(event) =>
                            updateField(field.id, {
                              required: event.target.checked,
                            })
                          }
                        />
                        Zorunlu
                      </label>
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={Boolean(field.halfWidth)}
                          onChange={(event) =>
                            updateField(field.id, {
                              halfWidth: event.target.checked,
                            })
                          }
                          disabled={field.type === "textarea" || field.type === "hidden"}
                        />
                        Yarım genişlik (yan yana)
                      </label>
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
