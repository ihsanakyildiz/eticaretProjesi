import type { Metadata } from "next";
import { CustomerForm } from "../customer-form";

export const metadata: Metadata = {
  title: "Yeni müşteri",
};

export default function NewCustomerPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Mağaza</p>
        <h1 className="mt-1 text-xl font-semibold text-slate-800 sm:text-2xl">Yeni müşteri</h1>
        <p className="mt-2 text-sm text-slate-500">
          Müşteri sizin oluşturduğunuz hesapla giriş yapabilir. Teslimat ve fatura adreslerini
          ayrı ayrı ekleyebilirsiniz. Şifreyi kendisine iletmeyi unutmayın.
        </p>
      </div>
      <CustomerForm mode="create" />
    </div>
  );
}
