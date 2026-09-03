export const IMPORT_PATHS = {
  hub: "/admin/products/import",
  excel: "/admin/products/import/excel",
  excelUpdate: "/admin/products/import/excel/update",
  xml: "/admin/products/import/xml",
  xmlNew: "/admin/products/import/xml/new",
  xmlFeed: (id: string) => `/admin/products/import/xml/${id}`,
  api: "/admin/products/import/api",
  apiNew: "/admin/products/import/api/new",
  apiFeed: (id: string) => `/admin/products/import/api/${id}`,
} as const;
