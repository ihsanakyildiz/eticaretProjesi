import type { Metadata } from "next";
import type { CatalogSearchParams } from "@/components/site/catalog/catalog-listing-screen";
import { catalogCatchAllMetadata, renderCatalogCatchAll } from "@/lib/catalog-path-page";

export const revalidate = 60;
export const dynamicParams = true;

type PageProps = {
  params: Promise<{ slug: string; urlId: string }>;
  searchParams: Promise<CatalogSearchParams>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, urlId } = await params;
  return catalogCatchAllMetadata({ params: Promise.resolve({ path: [slug, urlId] }) });
}

export default async function RootSlugWithIdPage({ params, searchParams }: PageProps) {
  const [{ slug, urlId }, search] = await Promise.all([params, searchParams]);
  return renderCatalogCatchAll({ path: [slug, urlId], search });
}
