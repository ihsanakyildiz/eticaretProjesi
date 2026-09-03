"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

const inputClass =
  "w-full rounded-md border border-[#e9ebec] bg-white px-2 py-1.5 font-mono text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#0ab39c] focus:ring-2 focus:ring-[#0ab39c]/20";

export function QuickEditCell({
  savedValue,
  formatGhost,
  normalize,
  onCommit,
  disabled,
  ariaLabel,
  inputMode,
  placeholder,
  trailing,
}: {
  savedValue: string;
  formatGhost: (value: string) => string;
  normalize: (raw: string) => { ok: true; value: string } | { ok: false; error: string };
  onCommit: (value: string) => Promise<{ error?: string; savedValue?: string }>;
  disabled?: boolean;
  ariaLabel: string;
  inputMode?: "text" | "decimal" | "numeric";
  placeholder?: string;
  trailing?: ReactNode;
}) {
  const [draft, setDraft] = useState(savedValue);
  const [ghost, setGhost] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const savedRef = useRef(savedValue);

  useEffect(() => {
    savedRef.current = savedValue;
    setDraft(savedValue);
  }, [savedValue]);

  useEffect(() => {
    if (!ghost) return;
    const timer = window.setTimeout(() => setGhost(null), 2500);
    return () => window.clearTimeout(timer);
  }, [ghost]);

  const commit = async () => {
    if (disabled || saving) return;
    const parsed = normalize(draft);
    if (!parsed.ok) {
      setError(parsed.error);
      setDraft(savedRef.current);
      return;
    }
    if (parsed.value === savedRef.current) {
      setError(null);
      setDraft(parsed.value);
      return;
    }
    const previous = savedRef.current;
    setSaving(true);
    setError(null);
    try {
      const result = await onCommit(parsed.value);
      if (result.error) {
        setError(result.error);
        setDraft(savedRef.current);
        return;
      }
      const next = result.savedValue ?? parsed.value;
      savedRef.current = next;
      setDraft(next);
      setGhost(formatGhost(previous));
    } catch {
      setError("Kayıt güncellenemedi.");
      setDraft(savedRef.current);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-w-0">
      <div className="relative">
        <input
        aria-label={ariaLabel}
        disabled={disabled || saving}
        readOnly={disabled}
        value={draft}
        inputMode={inputMode}
        placeholder={placeholder}
        onChange={(event) => {
          setDraft(event.target.value);
          if (error) setError(null);
        }}
        onBlur={() => {
          void commit();
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            event.currentTarget.blur();
            return;
          }
          if (event.key === "Escape") {
            event.preventDefault();
            setDraft(savedRef.current);
            setError(null);
            event.currentTarget.blur();
          }
        }}
        autoComplete="off"
        spellCheck={false}
        className={`${inputClass} ${trailing ? "pr-8" : ""} ${disabled ? "cursor-not-allowed bg-[#f3f6f9] text-slate-600" : ""} ${
          error ? "border-rose-300 focus:border-rose-400 focus:ring-rose-200" : ""
        }`}
      />
        {trailing ? (
          <div className="absolute top-1/2 right-1 z-10 -translate-y-1/2">{trailing}</div>
        ) : null}
      </div>
      <p className={`mt-0.5 min-h-4 text-[11px] leading-4 ${error ? "text-rose-600" : "text-slate-400"}`}>
        {error ? error : ghost ? <>önce <span className="line-through">{ghost}</span></> : "\u00a0"}
      </p>
    </div>
  );
}
