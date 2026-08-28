"use client";

import { useActionState, useEffect, useRef } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import {
  submitContactFormAction,
  type ContactFormSubmitState,
} from "@/app/(site)/contact-form-actions";
import type { ContactFormConfig, ContactFormField } from "@/config/contact-form";
import { SectionHeading } from "@/components/site/section-heading";
import { normalizeSectionText } from "@/lib/section-display-text";

type ContactFormSectionProps = {
  sectionId: string;
  title?: string | null;
  subtitle?: string | null;
  eyebrow?: string | null;
  config: ContactFormConfig;
};

const fieldClass =
  "w-full rounded-xl border border-site-border bg-white px-3.5 py-2.5 text-sm text-site-fg outline-none transition placeholder:text-site-muted focus:border-site-primary focus:ring-2 focus:ring-site-primary/15";

function FieldControl({
  field,
  error,
}: {
  field: ContactFormField;
  error?: string;
}) {
  const common = {
    id: `cf_${field.id}`,
    name: field.name,
    required: field.required,
    "aria-invalid": Boolean(error) || undefined,
  } as const;

  if (field.type === "hidden") {
    return <input type="hidden" name={field.name} defaultValue={field.defaultValue ?? ""} />;
  }

  if (field.type === "textarea") {
    return (
      <textarea
        {...common}
        rows={field.rows ?? 5}
        placeholder={field.placeholder}
        className={fieldClass}
      />
    );
  }

  if (field.type === "select") {
    return (
      <select {...common} className={fieldClass} defaultValue="">
        <option value="" disabled>
          {field.placeholder || "Seçin…"}
        </option>
        {(field.options ?? []).map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === "radio") {
    return (
      <div className="space-y-2">
        {(field.options ?? []).map((option) => (
          <label key={option.value} className="flex items-center gap-2 text-sm text-site-fg">
            <input
              type="radio"
              name={field.name}
              value={option.value}
              required={field.required}
              className="text-site-primary focus:ring-site-primary"
            />
            {option.label}
          </label>
        ))}
      </div>
    );
  }

  if (field.type === "checkbox") {
    return (
      <label className="flex items-start gap-2.5 text-sm text-site-fg">
        <input
          type="checkbox"
          name={field.name}
          required={field.required}
          className="mt-0.5 rounded border-site-border text-site-primary focus:ring-site-primary"
        />
        <span>{field.label}</span>
      </label>
    );
  }

  return (
    <input
      {...common}
      type={field.type}
      placeholder={field.placeholder}
      defaultValue={field.defaultValue}
      className={fieldClass}
    />
  );
}

export function ContactFormSection({
  sectionId,
  title,
  subtitle,
  eyebrow,
  config,
}: ContactFormSectionProps) {
  const [state, formAction, pending] = useActionState(
    submitContactFormAction,
    {} as ContactFormSubmitState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  const eyebrowText = normalizeSectionText(eyebrow);
  const titleText = normalizeSectionText(title);
  const subtitleText = normalizeSectionText(subtitle);
  const hasHeading = Boolean(eyebrowText || titleText || subtitleText);

  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {hasHeading ? (
          <SectionHeading
            eyebrow={eyebrowText}
            title={titleText}
            subtitle={subtitleText}
            centered
            className="mb-10"
          />
        ) : null}

        <div className={`mx-auto max-w-2xl ${hasHeading ? "" : ""}`}>
          <div className="rounded-3xl border border-site-border bg-site-card p-6 shadow-sm sm:p-8">
            {state.success ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <CheckCircle2 className="h-12 w-12 text-emerald-500" />
                <p className="mt-4 text-lg font-semibold text-site-fg">Teşekkürler</p>
                <p className="mt-2 max-w-md text-sm text-site-muted">
                  {state.message}
                </p>
              </div>
            ) : (
              <form ref={formRef} action={formAction} className="space-y-4">
                <input type="hidden" name="sectionId" value={sectionId} />
                {/* Honeypot */}
                <input
                  type="text"
                  name="website_url"
                  tabIndex={-1}
                  autoComplete="off"
                  className="hidden"
                  aria-hidden
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  {config.fields.map((field) => {
                    if (field.type === "hidden") {
                      return <FieldControl key={field.id} field={field} />;
                    }

                    const full =
                      !field.halfWidth ||
                      field.type === "textarea" ||
                      field.type === "checkbox" ||
                      field.type === "radio";

                    return (
                      <div
                        key={field.id}
                        className={full ? "sm:col-span-2" : undefined}
                      >
                        {field.type !== "checkbox" ? (
                          <label
                            htmlFor={`cf_${field.id}`}
                            className="mb-1.5 block text-sm font-medium text-site-fg"
                          >
                            {field.label}
                            {field.required ? (
                              <span className="text-rose-500"> *</span>
                            ) : null}
                          </label>
                        ) : null}
                        <FieldControl
                          field={field}
                          error={state.fieldErrors?.[field.name]}
                        />
                        {field.helpText ? (
                          <p className="mt-1 text-xs text-site-muted">{field.helpText}</p>
                        ) : null}
                        {state.fieldErrors?.[field.name] ? (
                          <p className="mt-1 text-xs text-rose-600">
                            {state.fieldErrors[field.name]}
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>

                {state.error ? (
                  <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    {state.error}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={pending}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-site-primary px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-70 sm:w-auto"
                >
                  {pending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  {config.submitLabel || "Mesaj Gönder"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
