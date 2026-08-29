"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronsUpDown, Search } from "lucide-react";
import { DEFAULT_PHONE_COUNTRY_CODE } from "@/data/phone-country-codes";
import { composePhone, digitsOnly, parsePhone, uniquePhoneCountryCodes } from "@/lib/phone-number";

const CODE_OPTIONS = uniquePhoneCountryCodes();

type Variant = "admin" | "site";

type Props = {
  id?: string;
  name?: string;
  label?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  variant?: Variant;
  labelClassName?: string;
};

function normalizeSearch(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function PhoneInput({
  id,
  name,
  label = "Telefon numarası",
  value,
  defaultValue = "",
  onChange,
  required = false,
  disabled = false,
  variant = "admin",
  labelClassName,
}: Props) {
  const generatedId = useId();
  const numberId = id ?? generatedId;
  const isControlled = value !== undefined;
  const parsedInitial = parsePhone(isControlled ? value : defaultValue);
  const [code, setCode] = useState(parsedInitial.code);
  const [national, setNational] = useState(parsedInitial.national);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isControlled) return;
    const next = parsePhone(value);
    setCode(next.code);
    setNational(next.national);
  }, [isControlled, value]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    window.addEventListener("mousedown", onPointerDown);
    const timer = window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.clearTimeout(timer);
    };
  }, [open]);

  const composed = composePhone(code, national);
  const filtered = useMemo(() => {
    const needle = normalizeSearch(query);
    if (!needle) return CODE_OPTIONS;
    return CODE_OPTIONS.filter((item) => normalizeSearch(item.searchText).includes(needle));
  }, [query]);

  const emit = (nextCode: string, nextNational: string) => {
    setCode(nextCode);
    setNational(nextNational);
    onChange?.(composePhone(nextCode, nextNational));
  };

  const isAdmin = variant === "admin";
  const triggerClass = isAdmin
    ? "flex w-full items-center justify-between gap-1 rounded-md border border-[#e9ebec] bg-white px-2.5 py-2 text-left text-sm text-slate-800 outline-none hover:border-slate-300 focus:border-[#0ab39c] focus:ring-2 focus:ring-[#0ab39c]/20 disabled:opacity-60"
    : "flex w-full items-center justify-between gap-1 rounded-lg border border-site-border bg-site-bg px-2.5 py-2.5 text-left text-sm outline-none focus:border-site-primary focus:ring-2 focus:ring-site-primary/20 disabled:opacity-60";
  const numberClass = isAdmin
    ? "w-full rounded-md border border-[#e9ebec] bg-white px-3 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-[#0ab39c] focus:ring-2 focus:ring-[#0ab39c]/20 disabled:opacity-60"
    : "w-full rounded-lg border border-site-border bg-site-bg px-3 py-2.5 text-sm outline-none placeholder:text-site-muted focus:border-site-primary focus:ring-2 focus:ring-site-primary/20 disabled:opacity-60";
  const labelClass = isAdmin
    ? "mb-1.5 block text-sm font-medium text-slate-700"
    : "mb-1.5 block text-sm font-medium text-site-fg";

  return (
    <div>
      {label ? (
        <label htmlFor={numberId} className={labelClassName ?? labelClass}>
          {label}
          {required ? " *" : ""}
        </label>
      ) : null}
      {name ? <input type="hidden" name={name} value={composed} /> : null}
      <div className="flex gap-2">
        <div ref={rootRef} className="relative w-[6.75rem] shrink-0">
          <button
            type="button"
            disabled={disabled}
            aria-label="Ülke kodu"
            aria-haspopup="listbox"
            aria-expanded={open}
            onClick={() => !disabled && setOpen((current) => !current)}
            className={triggerClass}
          >
            <span className={code ? "" : isAdmin ? "text-slate-400" : "text-site-muted"}>
              {code || "Seç..."}
            </span>
            <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
          </button>
          {open ? (
            <div
              className={`absolute z-40 mt-1 w-56 overflow-hidden rounded-md border bg-white shadow-lg ${
                isAdmin ? "border-[#e9ebec]" : "border-site-border"
              }`}
            >
              <div className={`border-b p-2 ${isAdmin ? "border-[#e9ebec]" : "border-site-border"}`}>
                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    ref={searchRef}
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Kod veya ülke ara…"
                    className={`w-full rounded-md border py-1.5 pr-2 pl-7 text-xs outline-none ${
                      isAdmin
                        ? "border-[#e9ebec] bg-[#f3f6f9] focus:border-[#0ab39c]"
                        : "border-site-border bg-site-bg focus:border-site-primary"
                    }`}
                  />
                </div>
              </div>
              <ul role="listbox" className="max-h-52 overflow-y-auto py-1">
                {filtered.length === 0 ? (
                  <li className="px-3 py-4 text-center text-xs text-slate-400">Sonuç yok</li>
                ) : (
                  filtered.map((item) => (
                    <li key={`${item.code}-${item.country}`}>
                      <button
                        type="button"
                        onClick={() => {
                          emit(item.code, national);
                          setOpen(false);
                          setQuery("");
                        }}
                        className={`flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm hover:bg-[#f3f6f9] ${
                          item.code === code ? "font-medium text-[#0ab39c]" : "text-slate-700"
                        }`}
                      >
                        <span>{item.code}</span>
                        <span className="truncate text-xs text-slate-400">{item.country}</span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          ) : null}
        </div>
        <input
          id={numberId}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          required={required}
          disabled={disabled}
          value={national}
          placeholder="5XX XXX XX XX"
          onChange={(event) => emit(code || DEFAULT_PHONE_COUNTRY_CODE, digitsOnly(event.target.value))}
          className={numberClass}
        />
      </div>
    </div>
  );
}
