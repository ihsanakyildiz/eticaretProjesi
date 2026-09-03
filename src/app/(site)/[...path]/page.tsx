import type { Metadata } from "next";
import type { CatalogSearchParams } from "@/components/site/catalog/catalog-listing-screen";
import { catalogCatchAllMetadata, renderCatalogCatchAll } from "@/lib/catalog-path-page";

export const revalidate = 60;

type PageProps = {
  params: Promise<{ path: string[] }>;
  searchParams: Promise<CatalogSearchParams>;
};

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  return catalogCatchAllMetadata(props);
}

export default async function CatalogCatchAllPage({ params, searchParams }: PageProps) {
  const [{ path }, search] = await Promise.all([params, searchParams]);
  return renderCatalogCatchAll({ path, search });
}
