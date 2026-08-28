"use client";

import { useId, useState } from "react";

type AdminSwitchProps = {
  name?: string;
  label: string;
  description?: string;
  defaultChecked?: boolean;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
};

/**
 * Form uyumlu aç/kapa anahtarı.
 * Uncontrolled: name + defaultChecked (native checkbox gönderir).
 * Controlled: checked + onChange (isteğe bağlı name ile hidden value).
 */
export function AdminSwitch({
  name,
  label,
  description,
  defaultChecked = false,
  checked,
  onChange,
  disabled = false,
  className = "",
}: AdminSwitchProps) {
  const id = useId();
  const isControlled = checked !== undefined;
  const [uncontrolled, setUncontrolled] = useState(defaultChecked);
  const on = isControlled ? Boolean(checked) : uncontrolled;

  const setOn = (next: boolean) => {
    if (!isControlled) setUncontrolled(next);
    onChange?.(next);
  };

  return (
    <label
      htmlFor={id}
      className={`inline-flex cursor-pointer items-center gap-3 rounded-md border border-[#e9ebec] px-4 py-2.5 ${
        disabled ? "cursor-not-allowed opacity-60" : ""
      } ${className}`}
    >
      {isControlled && name && on ? (
        <input type="hidden" name={name} value="true" />
      ) : null}

      <span className="relative inline-flex h-6 w-11 shrink-0 items-center">
        {isControlled ? (
          <button
            id={id}
            type="button"
            role="switch"
            aria-checked={on}
            disabled={disabled}
            onClick={() => setOn(!on)}
            className={`relative h-6 w-11 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3577f1]/40 focus-visible:ring-offset-2 ${
              on ? "bg-[#3577f1]" : "bg-[#e9ebec]"
            }`}
          >
            <span
              aria-hidden
              className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                on ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        ) : (
          <>
            <input
              id={id}
              type="checkbox"
              name={name}
              defaultChecked={defaultChecked}
              disabled={disabled}
              className="peer sr-only"
              onChange={(event) => setOn(event.target.checked)}
            />
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-full bg-[#e9ebec] transition-colors peer-checked:bg-[#3577f1] peer-focus-visible:ring-2 peer-focus-visible:ring-[#3577f1]/40 peer-focus-visible:ring-offset-2"
            />
            <span
              aria-hidden
              className="pointer-events-none absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5"
            />
          </>
        )}
      </span>

      <span className="min-w-0">
        <span className="block text-sm font-medium text-slate-700">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-xs text-slate-500">{description}</span>
        ) : null}
      </span>
    </label>
  );
}
