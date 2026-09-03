import "server-only";

import ExcelJS from "exceljs";
import { formatMinorToMajorInput, fromChargeAndListPrice } from "@/lib/product-money";
import { cellText } from "@/lib/product-import-excel";
import {
  isProductUpdateMode,
  iterateProductsForUpdate,
  productUpdateModeLabel,
  updateNeedsVariant,
  type ProductUpdateFilter,
  type ProductUpdateMode,
  type ProductUpdateRawRow,
} from "@/lib/product-import-update";

const SETTINGS_SHEET = "_guncelleme";

type UpdateColumnKey = keyof Omit<ProductUpdateRawRow, "rowNumber">;

const UPDATE_COLUMNS: Array<{
  key: UpdateColumnKey;
  header: string;
  modes: ProductUpdateMode[];
  locked?: boolean;
}> = [
  { key: "productUrlId", header: "Ürün ID", modes: ["all", "images", "price", "stock", "sale"], locked: true },
  { key: "variantId", header: "Varyant ID", modes: ["all", "images", "price", "stock"], locked: true },
  { key: "title", header: "Ürün adı", modes: ["all", "images", "price", "stock", "sale"] },
  { key: "variantTitle", header: "Varyant", modes: ["all", "images", "price", "stock"] },
  { key: "productSku", header: "Ürün kodu", modes: ["all"] },
  { key: "variantSku", header: "SKU", modes: ["all"] },
  { key: "barcode", header: "Barkod", modes: ["all"] },
  { key: "category", header: "Kategori", modes: ["all"] },
  { key: "brand", header: "Marka", modes: ["all"] },
  { key: "price", header: "Satış fiyatı (KDV hariç)", modes: ["all", "price"] },
  { key: "discount", header: "İndirimli satış fiyatı (KDV hariç)", modes: ["all", "price"] },
  { key: "compareAt", header: "Karşılaştırma fiyatı", modes: ["all", "price"] },
  { key: "stock", header: "Stok", modes: ["all", "stock"] },
  { key: "imageUrl", header: "Görsel URL", modes: ["all", "images"] },
  { key: "availableForOrder", header: "Siparişe açık", modes: ["all", "sale"] },
  { key: "isActive", header: "Aktif", modes: ["all"] },
];

const UPDATE_HEADER_ALIASES: Partial<Record<UpdateColumnKey, string[]>> = {
  price: ["fiyat (kdv hariç)", "fiyat", "satış fiyatı", "satis fiyati"],
  discount: [
    "indirimli satış fiyatı",
    "indirimli satis fiyati",
    "indirimli satış fiyatı (kdv hariç)",
    "indirimli",
  ],
  compareAt: ["karşılaştırma fiyatı", "karsilastirma fiyati", "compare at"],
};

function columnsForMode(mode: ProductUpdateMode, includeLegacy = true) {
  return UPDATE_COLUMNS.filter(
    (column) => column.modes.includes(mode) && (includeLegacy || column.key !== "compareAt"),
  );
}

function yesNo(value: boolean) {
  return value ? "Evet" : "Hayır";
}

export async function buildProductUpdateWorkbook(
  filter: ProductUpdateFilter,
  mode: ProductUpdateMode,
) {
  const columns = columnsForMode(mode, false);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Eticaret";
  workbook.created = new Date();

  const settings = workbook.addWorksheet(SETTINGS_SHEET);
  settings.state = "hidden";
  settings.getRow(1).values = ["mod", mode];

  const sheet = workbook.addWorksheet("Guncelleme");
  const header = sheet.getRow(1);
  columns.forEach((column, index) => {
    const cell = header.getCell(index + 1);
    cell.value = column.header;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: column.locked ? "FF405189" : "FF0AB39C" },
    };
    sheet.getColumn(index + 1).width = Math.min(36, Math.max(16, column.header.length + 4));
  });
  header.height = 22;
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  let excelRow = 2;
  for await (const products of iterateProductsForUpdate(filter, mode)) {
    for (const product of products) {
      const gallery = product.images.map((image) => image.url).join(", ");
      const variants = product.variants.length > 0 ? product.variants : [null];
      const rows = updateNeedsVariant(mode) ? variants : [variants[0] ?? null];
      for (const variant of rows) {
        if (excelRow > 50001) break;
        const values: Record<UpdateColumnKey, string> = {
          productUrlId: String(product.urlId),
          variantId: variant?.id ?? "",
          title: product.title,
          variantTitle: variant?.title ?? "",
          productSku: product.sku ?? "",
          variantSku: variant?.sku ?? "",
          barcode: variant?.barcode ?? "",
          category: product.category?.name ?? "",
          brand: product.brand?.name ?? "",
          price: variant
            ? formatMinorToMajorInput(
                fromChargeAndListPrice(variant.priceMinor, variant.compareAtMinor).saleMinor,
              )
            : "",
          discount: (() => {
            if (!variant) return "";
            const list = fromChargeAndListPrice(variant.priceMinor, variant.compareAtMinor);
            return list.discountMinor != null ? formatMinorToMajorInput(list.discountMinor) : "";
          })(),
          compareAt: "",
          stock: variant ? String(variant.stockQuantity) : "",
          imageUrl: gallery || product.image || variant?.image || "",
          availableForOrder: yesNo(product.availableForOrder),
          isActive: yesNo(product.isActive),
        };
        sheet.addRow(columns.map((column) => values[column.key]));
        excelRow += 1;
      }
      if (excelRow > 50001) break;
    }
    if (excelRow > 50001) break;
  }

  const help = workbook.addWorksheet("Aciklama");
  help.getColumn(1).width = 28;
  help.getColumn(2).width = 80;
  help.getRow(1).values = ["Alan", "Açıklama"];
  help.getRow(1).font = { bold: true };
  help.getRow(2).values = ["İşlem", productUpdateModeLabel(mode)];
  help.getRow(3).values = [
    "Ürün ID",
    "Değiştirmeyin. Güncelleme bu numaraya göre yapılır. ID’siz satır yeni ürün olarak eklenmez, hata verir.",
  ];
  help.getRow(4).values = [
    "Varyant ID",
    "Fiyat, stok ve tüm alan güncellemesinde zorunludur. Değiştirmeyin.",
  ];
  help.getRow(5).values = [
    "Benzersizlik",
    "Aynı barkod veya aynı ürün kodu başka bir üründe olamaz. Çakışan satırlar güncellenmez.",
  ];
  help.getRow(6).values = [
    "Satış fiyatı",
    "Normal satış (KDV hariç). İndirim yoksa müşteri bunu öder.",
  ];
  help.getRow(7).values = [
    "İndirimli satış",
    "Doluysa müşteri bunu öder; satış fiyatı sitede üstü çizili görünür. İndirimi kaldırmak için bu kolonu boş bırakıp satış fiyatını doldurun.",
  ];

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export async function parseProductUpdateWorkbook(buffer: Buffer): Promise<{
  mode: ProductUpdateMode;
  rows: ProductUpdateRawRow[];
}> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as Parameters<ExcelJS.Xlsx["load"]>[0]);

  const settings = workbook.getWorksheet(SETTINGS_SHEET);
  const modeRaw = String(settings?.getRow(1).getCell(2).value ?? "").trim();
  if (!isProductUpdateMode(modeRaw)) {
    throw new Error("Bu dosya güncelleme kalıbı değil. Önce filtreleyip Excel indirin.");
  }

  const sheet =
    workbook.getWorksheet("Guncelleme") ??
    workbook.getWorksheet("Güncelleme") ??
    workbook.worksheets.find((item) => item.name !== SETTINGS_SHEET && item.name !== "Aciklama") ??
    workbook.worksheets[0];
  if (!sheet) throw new Error("Excel dosyasında sayfa bulunamadı.");

  const columns = columnsForMode(modeRaw);
  const headerRow = sheet.getRow(1);
  const keyByColumn = new Map<number, UpdateColumnKey>();
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const header = cellText(cell).trim().toLocaleLowerCase("tr-TR");
    const column = columns.find((item) => {
      if (item.header.toLocaleLowerCase("tr-TR") === header) return true;
      return UPDATE_HEADER_ALIASES[item.key]?.includes(header) ?? false;
    });
    if (column) keyByColumn.set(colNumber, column.key);
  });
  if (![...keyByColumn.values()].includes("productUrlId")) {
    throw new Error("Ürün ID kolonu bulunamadı. Lütfen indirilen güncelleme Excel’ini kullanın.");
  }

  const rows: ProductUpdateRawRow[] = [];
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    const raw: ProductUpdateRawRow = {
      rowNumber,
      productUrlId: "",
      variantId: "",
      title: "",
      variantTitle: "",
      productSku: "",
      variantSku: "",
      barcode: "",
      category: "",
      brand: "",
      price: "",
      discount: "",
      compareAt: "",
      stock: "",
      imageUrl: "",
      availableForOrder: "",
      isActive: "",
    };
    let hasValue = false;
    keyByColumn.forEach((key, colNumber) => {
      const value = cellText(row.getCell(colNumber));
      raw[key] = value;
      if (value) hasValue = true;
    });
    if (hasValue) rows.push(raw);
  });

  return { mode: modeRaw, rows };
}
