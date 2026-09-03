export type CatalogSidebarCategory = {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  urlId?: number;
  productCount: number;
};
