import { catalogIndexPage, catalogListingMetadata } from "@/lib/catalog-page-handlers";

export const revalidate = 60;
export const generateMetadata = catalogListingMetadata;
export default catalogIndexPage("magaza");
