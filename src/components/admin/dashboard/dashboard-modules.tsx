import Link from "next/link";
import {
  ArrowUpRight,
  CircleHelp,
  FileText,
  Images,
  LayoutGrid,
  Menu,
  Settings,
  type LucideIcon,
} from "lucide-react";
import type { DashboardModule } from "@/lib/dashboard";

const iconByLabel: Record<string, LucideIcon> = {
  Sayfalar: FileText,
  Hero: Images,
  Kartlar: LayoutGrid,
  SSS: CircleHelp,
  Menüler: Menu,
  Ayarlar: Settings,
};

const toneStyles: Record<
  DashboardModule["tone"],
  string
> = {
  teal: "border-[#0ab39c]/20 bg-[#0ab39c]/5 text-[#0ab39c]",
  indigo: "border-[#405189]/20 bg-[#405189]/5 text-[#405189]",
  amber: "border-amber-500/20 bg-amber-500/5 text-amber-600",
  sky: "border-sky-500/20 bg-sky-500/5 text-sky-600",
  violet: "border-violet-500/20 bg-violet-500/5 text-violet-600",
  rose: "border-rose-500/20 bg-rose-500/5 text-rose-600",
};

export function DashboardModules({ modules }: { modules: DashboardModule[] }) {
  return (
    <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
      <h3 className="text-base font-semibold text-slate-800">Modüller</h3>
      <p className="mt-1 text-sm text-slate-500">Sık kullanılan yönetim alanlarına kısayol</p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {modules.map((module) => {
          const Icon = iconByLabel[module.label] ?? FileText;
          return (
            <Link
              key={module.href}
              href={module.href}
              className={`group rounded-lg border px-4 py-3 transition hover:shadow-sm ${toneStyles[module.tone]}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <span className="text-sm font-semibold">{module.label}</span>
                </div>
                <ArrowUpRight className="h-3.5 w-3.5 opacity-60 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
              <p className="mt-2 text-xs opacity-80">{module.description}</p>
              {module.label !== "Ayarlar" ? (
                <p className="mt-2 text-xs font-medium tabular-nums opacity-90">
                  {module.count} kayıt
                </p>
              ) : null}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
