import Link from "next/link";
import {
  Briefcase,
  FileText,
  FolderKanban,
  Images,
  Menu,
  Newspaper,
  type LucideIcon,
} from "lucide-react";
import type { DashboardStat } from "@/lib/dashboard";

const iconMap: Record<DashboardStat["icon"], LucideIcon> = {
  pages: FileText,
  works: Briefcase,
  projects: FolderKanban,
  posts: Newspaper,
  heroes: Images,
  menus: Menu,
};

const toneMap: Record<
  DashboardStat["tone"],
  { icon: string; bar: string }
> = {
  teal: { icon: "bg-[#0ab39c]/10 text-[#0ab39c]", bar: "bg-[#0ab39c]" },
  indigo: { icon: "bg-[#405189]/10 text-[#405189]", bar: "bg-[#405189]" },
  amber: { icon: "bg-amber-500/10 text-amber-600", bar: "bg-amber-500" },
  sky: { icon: "bg-sky-500/10 text-sky-600", bar: "bg-sky-500" },
  violet: { icon: "bg-violet-500/10 text-violet-600", bar: "bg-violet-500" },
  rose: { icon: "bg-rose-500/10 text-rose-600", bar: "bg-rose-500" },
};

export function DashboardStats({ stats }: { stats: DashboardStat[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {stats.map((stat) => {
        const Icon = iconMap[stat.icon];
        const tone = toneMap[stat.tone];
        const activeRatio =
          stat.value > 0 ? Math.round((stat.active / stat.value) * 100) : 0;

        return (
          <div
            key={stat.title}
            className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-500">{stat.title}</p>
                <p className="mt-2 text-2xl font-semibold text-slate-800">
                  {stat.value}
                </p>
              </div>
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-lg ${tone.icon}`}
              >
                <Icon className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between text-xs text-slate-500">
                <span>{stat.active} aktif</span>
                <span>%{activeRatio}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[#f3f6f9]">
                <div
                  className={`h-full rounded-full ${tone.bar}`}
                  style={{ width: `${activeRatio}%` }}
                />
              </div>
            </div>

            <div className="mt-4">
              <Link
                href={stat.href}
                className="text-xs font-medium text-[#405189] hover:underline"
              >
                {stat.linkLabel}
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
