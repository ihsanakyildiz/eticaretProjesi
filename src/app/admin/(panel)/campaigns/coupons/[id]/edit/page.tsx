import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Gift } from "lucide-react";
import {
  loadAdminDiscountCouponForm,
  loadDiscountCouponFormLookups,
} from "@/lib/discount-coupons";
import { CouponForm } from "../../coupon-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Hediye çekini düzenle",
  description: "İndirim kodunu güncelleyin",
};

export default async function EditCouponPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [coupon, lookups] = await Promise.all([
    loadAdminDiscountCouponForm(id),
    loadDiscountCouponFormLookups(),
  ]);
  if (!coupon) notFound();

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <Link
          href="/admin/campaigns/coupons"
          className="inline-flex items-center gap-1 text-sm font-medium text-[#405189] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Hediye çeklerine dön
        </Link>
        <h1 className="mt-3 flex items-center gap-2 text-xl font-semibold text-slate-800 sm:text-2xl">
          <Gift className="h-6 w-6 text-[#405189]" />
          Hediye çekini düzenle
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          Kod, tutar, kullanım ve kapsamı güncelleyin. Pasif kodlar sepette kullanılamaz.
        </p>
      </div>
      <CouponForm
        categories={lookups.categories}
        brands={lookups.brands}
        initial={coupon}
      />
    </div>
  );
}
