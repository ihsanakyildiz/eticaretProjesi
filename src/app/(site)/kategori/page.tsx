import { catalogCategoryIndexMetadata, categoryIndexPage } from "@/lib/catalog-page-handlers";

export const revalidate = 60;
export const generateMetadata = catalogCategoryIndexMetadata;
export default categoryIndexPage("kategori");
