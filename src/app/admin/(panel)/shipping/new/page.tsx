import type { Metadata } from "next";
import { ShippingCarrierForm } from "../shipping-form";

export const metadata: Metadata = {
  title: "Yeni kargo firması",
};

export default function NewShippingCarrierPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Mağaza</p>
        <h1 className="mt-1 text-xl font-semibold text-slate-800 sm:text-2xl">
          Yeni kargo firması
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Bilinen bir sağlayıcı seçin veya özel bir kargo firması tanımlayın.
        </p>
      </div>

      <ShippingCarrierForm mode="create" />
    </div>
  );
}
