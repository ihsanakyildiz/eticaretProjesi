"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import {
  ORDER_STATUSES,
  orderStatusColor,
  orderStatusLabel,
  type OrderStatusCode,
} from "@/lib/orders";

type MenuPosition = {
  left: number;
  width: number;
  maxHeight: number;
  top?: number;
  bottom?: number;
};

export function OrderStatusSelect({
  value,
  disabled,
  onChange,
  className = "min-w-[13.5rem] max-w-[16.5rem]",
  size = "sm",
}: {
  value: OrderStatusCode;
  disabled?: boolean;
  onChange: (status: OrderStatusCode) => void;
  className?: string;
  size?: "sm" | "md";
}) {
  const triggerId = useId();
  const listboxId = `${triggerId}-listbox`;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<MenuPosition | null>(null);

  const updatePosition = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const spaceAbove = rect.top - 8;
    const openUp = spaceBelow < 200 && spaceAbove > spaceBelow;
    const maxHeight = Math.max(140, Math.min(288, openUp ? spaceAbove : spaceBelow));
    setPosition({
      left: rect.left,
      width: Math.max(rect.width, 220),
      maxHeight,
      ...(openUp
        ? { bottom: window.innerHeight - rect.top + 4 }
        : { top: rect.bottom + 4 }),
    });
  };

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  const menu =
    open && position
      ? createPortal(
          <ul
            ref={menuRef}
            id={listboxId}
            role="listbox"
            aria-labelledby={triggerId}
            className="overflow-auto rounded-md border border-[#e9ebec] bg-white py-1 shadow-lg"
            style={{
              position: "fixed",
              zIndex: 80,
              left: position.left,
              width: position.width,
              maxHeight: position.maxHeight,
              top: position.top,
              bottom: position.bottom,
            }}
          >
            {ORDER_STATUSES.map((status) => {
              const selected = status === value;
              return (
                <li key={status} role="option" aria-selected={selected}>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      setOpen(false);
                      if (status !== value) onChange(status);
                    }}
                    className={`flex w-full items-center gap-2 px-2 py-1.5 text-left ${
                      size === "md" ? "text-sm" : "text-xs"
                    } ${
                      selected ? "bg-[#f3f6f9] font-semibold text-slate-800" : "text-slate-700 hover:bg-[#f8f9fa]"
                    }`}
                  >
                    <StatusDot color={orderStatusColor(status)} />
                    <span className="min-w-0 flex-1">{orderStatusLabel(status)}</span>
                    {selected ? <Check className="h-3.5 w-3.5 shrink-0 text-[#0ab39c]" /> : null}
                  </button>
                </li>
              );
            })}
          </ul>,
          document.body,
        )
      : null;

  const triggerClass =
    size === "md"
      ? "flex w-full items-center gap-2 rounded-md border border-[#e9ebec] bg-white px-3 py-2 text-left text-sm font-medium text-slate-700 outline-none hover:border-[#ced4da] focus:border-[#0ab39c] disabled:opacity-60"
      : "flex w-full items-center gap-2 rounded-md border border-[#e9ebec] bg-white px-2 py-1.5 text-left text-xs font-medium text-slate-700 outline-none hover:border-[#ced4da] focus:border-[#0ab39c] disabled:opacity-60";

  return (
    <div className={className}>
      <button
        ref={triggerRef}
        type="button"
        id={triggerId}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => setOpen((current) => !current)}
        className={triggerClass}
      >
        <StatusDot color={orderStatusColor(value)} />
        <span className="min-w-0 flex-1 truncate">{orderStatusLabel(value)}</span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {menu}
    </div>
  );
}

function StatusDot({ color }: { color: string }) {
  return (
    <span
      aria-hidden
      className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
      style={{ backgroundColor: color }}
    />
  );
}
