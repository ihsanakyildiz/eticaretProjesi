import type { ReactNode } from "react";
import { ExternalLink } from "lucide-react";

export function AdminPublicLink({
  href,
  label = "Sitede aç",
  variant = "icon",
}: {
  href: string;
  label?: string;
  variant?: "icon" | "button";
}) {
  if (variant === "button") {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 rounded-md border border-[#e9ebec] px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-[#405189]"
      >
        {label}
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      title={label}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#e9ebec] text-slate-500 transition hover:bg-slate-50 hover:text-[#405189]"
    >
      <ExternalLink className="h-4 w-4" />
    </a>
  );
}

export function AdminPublicTextLink({
  href,
  children,
  className = "",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`hover:text-[#405189] hover:underline ${className}`}
    >
      {children}
    </a>
  );
}
