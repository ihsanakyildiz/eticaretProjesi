type DistributionItem = {
  label: string;
  value: number;
  tone: "teal" | "indigo" | "amber" | "sky" | "violet" | "rose";
};

const toneBar: Record<DistributionItem["tone"], string> = {
  teal: "bg-[#0ab39c]",
  indigo: "bg-[#405189]",
  amber: "bg-amber-500",
  sky: "bg-sky-500",
  violet: "bg-violet-500",
  rose: "bg-rose-500",
};

export function DashboardChart({ items }: { items: DistributionItem[] }) {
  const max = Math.max(...items.map((item) => item.value), 1);
  const total = items.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm xl:col-span-2">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-800">İçerik Dağılımı</h3>
          <p className="mt-1 text-sm text-slate-500">
            Modüllere göre kayıt sayısı · toplam {total}
          </p>
        </div>
      </div>

      {total === 0 ? (
        <p className="py-10 text-center text-sm text-slate-500">
          Henüz içerik kaydı yok. Hızlı erişimden eklemeye başlayabilirsiniz.
        </p>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const width = Math.max(Math.round((item.value / max) * 100), item.value > 0 ? 6 : 0);
            return (
              <div key={item.label}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">{item.label}</span>
                  <span className="tabular-nums text-slate-500">{item.value}</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-[#f3f6f9]">
                  <div
                    className={`h-full rounded-full ${toneBar[item.tone]}`}
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
