import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { PricingPlanDetailView } from "@/components/site/pricing/pricing-plan-detail-view";
import { prepareRichHtml, stripHtml } from "@/lib/html";
import { getMembershipFlags } from "@/lib/membership";
import { parsePerformance, withCdnUrl } from "@/lib/performance";
import {
  getPricingBillingOptions,
  getPricingPlanBySlug,
} from "@/lib/pricing";
import { publicPricingPlanHref } from "@/lib/public-urls";
import { buildPublicMetadata } from "@/lib/seo";
import { getSettingsMap } from "@/lib/settings";

export const revalidate = 60;
export const dynamicParams = true;

type PricingPlanDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: PricingPlanDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const plan = await getPricingPlanBySlug(slug).catch(() => null);
  if (!plan) return { title: "Paket" };

  const settings = await getSettingsMap().catch(
    () => ({}) as Record<string, string>,
  );
  const perf = parsePerformance(settings);
  const description =
    plan.blurb?.trim() ||
    stripHtml(plan.detailContent).slice(0, 160) ||
    `${plan.name} paket detayları`;

  return buildPublicMetadata({
    settings,
    title: plan.name,
    description,
    path: publicPricingPlanHref(plan.slug),
    image: withCdnUrl(plan.coverImage, perf.cdnUrl),
  });
}

export default async function PricingPlanDetailPage({
  params,
}: PricingPlanDetailPageProps) {
  const { slug } = await params;

  const [plan, settings, membership, billingOptions, session] =
    await Promise.all([
      getPricingPlanBySlug(slug),
      getSettingsMap().catch(() => ({}) as Record<string, string>),
      getMembershipFlags(),
      getPricingBillingOptions(),
      auth(),
    ]);

  if (!plan) notFound();

  const perf = parsePerformance(settings);
  const contentHtml = prepareRichHtml(plan.detailContent, {
    lazyImages: perf.lazyImages,
    lazyIframes: perf.lazyIframes,
    disableThirdParty: perf.disableThirdParty,
  });
  const coverImage = withCdnUrl(plan.coverImage, perf.cdnUrl);
  const purchaseEnabled = membership.enabled && membership.stripeEnabled;
  const isAuthenticated = Boolean(session?.user?.id);

  return (
    <PricingPlanDetailView
      plan={plan}
      contentHtml={contentHtml}
      coverImage={coverImage}
      purchaseEnabled={purchaseEnabled}
      membershipEnabled={membership.enabled}
      isAuthenticated={isAuthenticated}
      billingOptions={billingOptions}
    />
  );
}
