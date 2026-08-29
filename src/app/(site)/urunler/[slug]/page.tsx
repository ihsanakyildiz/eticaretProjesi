import { productDetailMetadata, productDetailPage } from "@/lib/catalog-page-handlers";

export const revalidate = 60;
export const dynamicParams = true;
export const generateMetadata = productDetailMetadata;
export default productDetailPage("urunler");
