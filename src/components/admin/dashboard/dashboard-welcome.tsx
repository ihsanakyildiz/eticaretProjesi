import Link from "next/link";
import { CalendarDays, Plus } from "lucide-react";

type DashboardWelcomeProps = {
  userName: string;
  contentTotal: number;
  activeTotal: number;
  quickActions: Array<{ label: string; href: string }>;
};

export function DashboardWelcome({
  userName,
  contentTotal,
  activeTotal,
  quickActions,
}: DashboardWelcomeProps) {
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Günaydın" : hour < 18 ? "İyi günler" : "İyi akşamlar";
  const today = new Date().toLocaleDateString("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-md border border-[#e9ebec] bg-[#f3f6f9] px-2.5 py-1 text-xs font-medium text-slate-500">
            <CalendarDays className="h-3.5 w-3.5" />
            {today}
          </div>
          <h1 className="mt-3 text-xl font-semibold text-slate-800 sm:text-2xl">
            {greeting}, {userName}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Panelde {contentTotal} içerik kaydı var · {activeTotal} aktif. Aşağıdan
            durum özetini inceleyebilir veya hızlıca yeni içerik ekleyebilirsiniz.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {quickActions.map((action, index) => (
            <Link
              key={action.href}
              href={action.href}
              className={
                index === 0
                  ? "inline-flex items-center gap-2 rounded-md bg-[#0ab39c] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#099885]"
                  : "inline-flex items-center gap-2 rounded-md border border-[#e9ebec] bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              }
            >
              {index === 0 ? <Plus className="h-4 w-4" /> : null}
              {action.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
