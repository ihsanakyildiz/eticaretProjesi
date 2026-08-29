import { categoryDetailMetadata, categoryDetailPage } from "@/lib/catalog-page-handlers";

export const revalidate = 60;
export const dynamicParams = true;
export const generateMetadata = categoryDetailMetadata;
export default categoryDetailPage("kategori");
