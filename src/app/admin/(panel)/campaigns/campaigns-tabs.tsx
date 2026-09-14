import Link from "next/link";

export function CampaignsTabs({ active }: { active: "campaigns" | "coupons" }) {
  const tabClass = (key: "campaigns" | "coupons") =>
    active === key
      ? "border-[#0ab39c] text-[#0ab39c]"
      : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700";

  return (
    <div className="flex gap-1 border-b border-[#e9ebec]">
      <Link
        href="/admin/campaigns"
        className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition ${tabClass("campaigns")}`}
      >
        Kampanyalar
      </Link>
      <Link
        href="/admin/campaigns/coupons"
        className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition ${tabClass("coupons")}`}
      >
        Hediye çeki
      </Link>
    </div>
  );
}
