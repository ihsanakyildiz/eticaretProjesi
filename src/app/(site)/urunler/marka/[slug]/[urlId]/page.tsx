import { brandDetailMetadata, brandDetailPage } from "@/lib/catalog-page-handlers";

export const revalidate = 60;
export const dynamicParams = true;
export const generateMetadata = brandDetailMetadata;
export default brandDetailPage("urunler/marka");
