import { brandIndexPage, catalogBrandIndexMetadata } from "@/lib/catalog-page-handlers";

export const revalidate = 60;
export const generateMetadata = catalogBrandIndexMetadata;
export default brandIndexPage("urunler/marka");
