import type { Metadata } from "next";
import { CartPage } from "@/components/site/cart/cart-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sepet",
  description: "Sepetinizdeki ürünleri inceleyin ve ödemeye geçin.",
};

export default function SepetPage() {
  return (
    <section className="border-b border-site-border py-10 sm:py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-xs font-semibold tracking-wide text-site-primary uppercase">Alışveriş</p>
        <h1 className="mt-1 font-display text-3xl font-bold text-site-fg">Sepet</h1>
        <div className="mt-8">
          <CartPage />
        </div>
      </div>
    </section>
  );
}
