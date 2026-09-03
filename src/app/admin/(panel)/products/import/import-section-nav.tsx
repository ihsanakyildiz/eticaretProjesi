"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IMPORT_PATHS } from "./import-paths";

const SECTIONS = [
  { id: "excel", href: IMPORT_PATHS.excel, label: "Excel", prefix: IMPORT_PATHS.excel },
  { id: "xml", href: IMPORT_PATHS.xml, label: "XML", prefix: IMPORT_PATHS.xml },
  { id: "api", href: IMPORT_PATHS.api, label: "API", prefix: IMPORT_PATHS.api },
] as const;

const EXCEL_MODES = [
  { href: IMPORT_PATHS.excel, label: "Yeni ürün yükle", exact: true },
  { href: IMPORT_PATHS.excelUpdate, label: "Ürün güncelle", exact: false },
] as const;

function isActive(pathname: string, href: string, exact = false) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function ImportSectionNav() {
  const pathname = usePathname();

  return (
    <div className="overflow-x-auto rounded-lg border border-[#e9ebec] bg-white shadow-sm">
      <div className="flex min-w-max gap-1 px-2">
        {SECTIONS.map((section) => {
          const active = isActive(pathname, section.prefix);
          return (
            <Link
              key={section.id}
              href={section.href}
              className={`border-b-2 px-4 py-3 text-sm font-medium transition ${
                active
                  ? "border-[#0ab39c] text-[#0ab39c]"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {section.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function ExcelModeNav() {
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap gap-2">
      {EXCEL_MODES.map((item) => {
        const active = isActive(pathname, item.href, item.exact);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-md px-4 py-2 text-sm font-medium ${
              active
                ? "bg-[#405189] text-white"
                : "border border-[#e9ebec] bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

export function ImportPageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Mağaza</p>
          <h1 className="mt-1 text-xl font-semibold text-slate-800 sm:text-2xl">{title}</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-500">{description}</p>
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
    </div>
  );
}
