"use client";

import { createContext, useContext, type ReactNode } from "react";
import {
  DEFAULT_URL_STRUCTURE,
  publicBrandIndexPath,
  publicCatalogPath,
  publicCategoryIndexPath,
  publicProductBrandHref,
  publicProductCategoryHref,
  publicProductHref,
  type UrlStructure,
} from "@/lib/url-structure";

const UrlStructureContext = createContext<UrlStructure>(DEFAULT_URL_STRUCTURE);

export function SiteUrlProvider({
  value,
  children,
}: {
  value: UrlStructure;
  children: ReactNode;
}) {
  return <UrlStructureContext.Provider value={value}>{children}</UrlStructureContext.Provider>;
}

export function useUrlStructure() {
  return useContext(UrlStructureContext);
}

export function useCatalogUrls() {
  const structure = useUrlStructure();
  return {
    structure,
    catalogPath: publicCatalogPath(structure),
    categoryIndexPath: publicCategoryIndexPath(structure),
    brandIndexPath: publicBrandIndexPath(structure),
    productHref: (slug: string, urlId?: number | null) => publicProductHref(slug, structure, urlId),
    categoryHref: (slug: string, urlId?: number | null) =>
      publicProductCategoryHref(slug, structure, urlId),
    brandHref: (slug: string, urlId?: number | null) => publicProductBrandHref(slug, structure, urlId),
  };
}
