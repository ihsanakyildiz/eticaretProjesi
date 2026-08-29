import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckoutFlow } from "@/components/site/checkout/checkout-flow";
import { loadCheckoutAddresses, loadCheckoutCarriers, requireCheckoutUser } from "@/lib/checkout";
import {
  checkoutStepLabel,
  firstSearchValue,
  parseCheckoutStep,
  type CheckoutQuery,
} from "@/lib/checkout-steps";
import { isStripeConfigured } from "@/lib/stripe";

type PageProps = {
  searchParams: Promise<CheckoutQuery>;
};

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const search = await searchParams;
  const step = parseCheckoutStep(firstSearchValue(search.adim));
  return {
    title: `Ödeme — ${checkoutStepLabel(step)}`,
    description: "Adres, kargo ve ödeme bilgilerinizi tamamlayın.",
  };
}

export default async function OdemePage({ searchParams }: PageProps) {
  const session = await requireCheckoutUser();
  if (!session?.user?.id) {
    redirect(`/giris?callbackUrl=${encodeURIComponent("/odeme?adim=adres")}`);
  }

  const search = await searchParams;
  const [addresses, carriers] = await Promise.all([
    loadCheckoutAddresses(session.user.id),
    loadCheckoutCarriers(0),
  ]);

  return (
    <section className="border-b border-site-border py-10 sm:py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-xs font-semibold tracking-wide text-site-primary uppercase">Alışveriş</p>
        <h1 className="mt-1 font-display text-3xl font-bold text-site-fg">Ödeme</h1>
        <div className="mt-8">
          <CheckoutFlow
            initialAddresses={addresses}
            initialCarriers={carriers.map(({ id, name, logo }) => ({ id, name, logo }))}
            cardEnabled={isStripeConfigured()}
            canceled={firstSearchValue(search.iptal) === "1"}
            step={parseCheckoutStep(firstSearchValue(search.adim))}
            query={search}
          />
        </div>
      </div>
    </section>
  );
}
