import "server-only";

import ExcelJS from "exceljs";
import {
  PRODUCT_IMPORT_COLUMNS,
  PRODUCT_IMPORT_MAX_ROWS,
  loadProductImportLookups,
  matchImportHeader,
  type ProductImportColumnKey,
  type ProductImportLookups,
  type ProductImportRawRow,
} from "@/lib/product-import";
import {
  productEstimatedDeliveryLabel,
  productSaleUnitLabel,
  productVisibilityLabel,
} from "@/lib/product-editor";

function richTextToString(value: unknown): string {
  if (!value || typeof value !== "object" || !("richText" in value)) return "";
  const parts = (value as { richText?: Array<{ text?: string }> }).richText;
  if (!Array.isArray(parts)) return "";
  return parts.map((part) => part.text ?? "").join("");
}

function valueToText(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    if ("richText" in value) return richTextToString(value);
    if ("text" in value) {
      const text = value.text;
      if (typeof text === "string") return text;
      const nested = richTextToString(text);
      if (nested) return nested;
    }
    if ("hyperlink" in value && typeof value.hyperlink === "string") {
      return value.hyperlink;
    }
    if ("result" in value) {
      return valueToText(value.result as ExcelJS.CellValue);
    }
  }
  return "";
}

export function cellText(cell: ExcelJS.Cell | ExcelJS.CellValue): string {
  if (cell && typeof cell === "object" && "value" in cell) {
    const fromValue = valueToText(cell.value).trim();
    const display = typeof cell.text === "string" ? cell.text.trim() : "";
    if (display.length > fromValue.length) return display;
    if (fromValue) return fromValue;
    if (cell.hyperlink) return String(cell.hyperlink).trim();
    return "";
  }
  return valueToText(cell as ExcelJS.CellValue).trim();
}

function visibleImportColumns() {
  return PRODUCT_IMPORT_COLUMNS.filter((column) => !("template" in column && column.template === false));
}

function applyHeaderRow(sheet: ExcelJS.Worksheet) {
  const row = sheet.getRow(1);
  const columns = visibleImportColumns();
  columns.forEach((column, index) => {
    const cell = row.getCell(index + 1);
    cell.value = column.header;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: column.required ? "FF0AB39C" : "FF405189" },
    };
    cell.alignment = { vertical: "middle", wrapText: true };
    sheet.getColumn(index + 1).width = Math.min(36, Math.max(16, column.header.length + 4));
    if (column.hint) {
      cell.note = column.hint;
    }
  });
  row.height = 22;
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: columns.length },
  };
}

function addListValidation(
  sheet: ExcelJS.Worksheet,
  columnIndex: number,
  formulae: string,
) {
  for (let row = 2; row <= 201; row += 1) {
    sheet.getCell(row, columnIndex).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [formulae],
      showErrorMessage: true,
      errorTitle: "Geçersiz değer",
      error: "Listeden bir değer seçin veya boş bırakın.",
    };
  }
}

function columnIndex(key: ProductImportColumnKey) {
  return visibleImportColumns().findIndex((column) => column.key === key) + 1;
}

function fillLookupSheet(
  workbook: ExcelJS.Workbook,
  name: string,
  rows: Array<{ name: string; slug: string }>,
) {
  const sheet = workbook.addWorksheet(name);
  sheet.getRow(1).values = ["Ad", "Slug"];
  sheet.getRow(1).font = { bold: true };
  rows.forEach((row, index) => {
    sheet.getRow(index + 2).values = [row.name, row.slug];
  });
  sheet.getColumn(1).width = 36;
  sheet.getColumn(2).width = 28;
}

export async function buildProductImportTemplate(lookups?: ProductImportLookups) {
  const data = lookups ?? (await loadProductImportLookups());
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Eticaret";
  workbook.created = new Date();

  const products = workbook.addWorksheet("Urunler");
  applyHeaderRow(products);

  addListValidation(products, columnIndex("isActive"), '"Evet,Hayır"');
  addListValidation(products, columnIndex("availableForOrder"), '"Evet,Hayır"');
  addListValidation(products, columnIndex("showPrice"), '"Evet,Hayır"');
  addListValidation(
    products,
    columnIndex("visibility"),
    '"Her yerde,Sadece katalogda,Sadece aramalarda,Hiçbir yerde"',
  );
  addListValidation(products, columnIndex("saleUnit"), '"Adet,Kilogram,Metre,Litre,Paket"');
  addListValidation(
    products,
    columnIndex("outOfStockBehavior"),
    '"Siparişe izin verme,Siparişe izin ver,Varsayılan"',
  );
  addListValidation(
    products,
    columnIndex("estimatedDelivery"),
    '"Aynı Gün Kargo,1 - 3 Gün Arası,3 - 5 Gün Arası,5 - 10 Gün Arası"',
  );

  const help = workbook.addWorksheet("Aciklama");
  help.getColumn(1).width = 28;
  help.getColumn(2).width = 18;
  help.getColumn(3).width = 72;
  help.getRow(1).values = ["Kolon", "Zorunlu", "Açıklama"];
  help.getRow(1).font = { bold: true };
  const helpColumns = visibleImportColumns();
  helpColumns.forEach((column, index) => {
    help.getRow(index + 2).values = [
      column.header,
      column.required ? "Evet" : "Hayır",
      column.hint || "İsteğe bağlı",
    ];
  });
  const start = helpColumns.length + 4;
  help.getRow(start).values = ["Notlar"];
  help.getRow(start).font = { bold: true };
  help.getRow(start + 1).values = [
    "",
    "",
    "Bu kalıp yalnızca yeni ürün eklemek içindir. Zorunlu alanları eksik veya hatalı olan ürün hiçbir satırıyla yüklenmez. Aynı barkod veya aynı ürün kodu başka üründe varsa yüklenmez.",
  ];
  help.getRow(start + 2).values = [
    "",
    "",
    "Tek beden/renk yoksa Ürün kodunu boş bırakın: her satır ayrı üründür ve varsayılan varyant oluşur.",
  ];
  help.getRow(start + 3).values = [
    "",
    "",
    "Renk + beden gibi kombinasyonlar için Shopify/WooCommerce yöntemi: her satır bir SKU’dur. Aynı Ürün kodunu tekrarlayın; Özellik 1 = Beden, Özellik 2 = Renk yazın.",
  ];
  help.getRow(start + 4).values = [
    "",
    "",
    "Örnek: Ürün kodu AYK-100. Satır 2: Beden 38 / Renk Siyah. Satır 3: Beden 38 / Renk Beyaz. Satır 4: Beden 39 / Renk Siyah. Ürün adı ve kategori ilk satırdan alınır.",
  ];
  help.getRow(start + 5).values = [
    "",
    "",
    "Özellik adları (Beden, Renk) Varyantlar menüsünde kayıtlı olmalıdır. Yeni değerler (38, Siyah) yoksa otomatik eklenir.",
  ];
  help.getRow(start + 6).values = [
    "",
    "",
    "Kategori, marka ve tedarikçi mevcut kayıtlardan seçilmelidir. Ad veya slug yazabilirsiniz.",
  ];
  help.getRow(start + 7).values = [
    "",
    "",
    `En fazla ${PRODUCT_IMPORT_MAX_ROWS.toLocaleString("tr-TR")} satır yükleyebilirsiniz. Her SKU satırında barkod zorunludur. Satış fiyatı boş veya 0 ise ürün yüklenir ama satışa kapanır. İndirimli satış doluysa sitede satış üstü çizili, müşteri indirimli tutarı öder.`,
  ];
  help.getRow(start + 8).values = [
    "",
    "",
    "Görsel URL’ler yükleme sırasında bu sunucuya indirilir. Uzak link açılmazsa o ürün yüklenmez. İlk adres kapak olur; varyant satırındaki ilk görsel o SKU’ya bağlanır.",
  ];
  help.getRow(start + 9).values = [
    "",
    "",
    `Görünürlük örnekleri: ${productVisibilityLabel("EVERYWHERE")}, ${productVisibilityLabel("CATALOG")}. Satış birimi: ${productSaleUnitLabel("PIECE")}. Teslimat: ${productEstimatedDeliveryLabel("DAYS_1_3")}. Excel dosyası diske yazılmaz; aktarım bitince satır önizleme verisi silinir.`,
  ];

  fillLookupSheet(workbook, "Kategoriler", data.categories);
  fillLookupSheet(workbook, "Markalar", data.brands);
  fillLookupSheet(workbook, "Tedarikciler", data.suppliers);

  const attributes = workbook.addWorksheet("Ozellikler");
  attributes.getRow(1).values = ["Özellik", "Değer", "Slug"];
  attributes.getRow(1).font = { bold: true };
  let attrRow = 2;
  for (const attribute of data.attributes) {
    if (attribute.values.length === 0) {
      attributes.getRow(attrRow).values = [attribute.name, "", attribute.slug];
      attrRow += 1;
      continue;
    }
    for (const value of attribute.values) {
      attributes.getRow(attrRow).values = [attribute.name, value.name, value.slug];
      attrRow += 1;
    }
  }
  attributes.getColumn(1).width = 28;
  attributes.getColumn(2).width = 28;
  attributes.getColumn(3).width = 28;

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export async function parseProductImportWorkbook(buffer: Buffer): Promise<ProductImportRawRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as Parameters<ExcelJS.Xlsx["load"]>[0]);

  const sheet =
    workbook.getWorksheet("Urunler") ??
    workbook.getWorksheet("Ürünler") ??
    workbook.worksheets.find((item) => item.name.toLocaleLowerCase("tr-TR").includes("urun")) ??
    workbook.worksheets[0];
  if (!sheet) throw new Error("Excel dosyasında sayfa bulunamadı.");

  const headerRow = sheet.getRow(1);
  const keyByColumn = new Map<number, ProductImportColumnKey>();
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const key = matchImportHeader(cellText(cell));
    if (key) keyByColumn.set(colNumber, key);
  });
  if (keyByColumn.size === 0) {
    throw new Error("Excel başlık satırı tanınamadı. Lütfen güncel kalıbı indirin.");
  }

  const rows: ProductImportRawRow[] = [];
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    if (rows.length >= PRODUCT_IMPORT_MAX_ROWS) return;
    const raw: ProductImportRawRow = { rowNumber };
    let hasValue = false;
    keyByColumn.forEach((key, colNumber) => {
      const value = cellText(row.getCell(colNumber));
      if (value) {
        raw[key] = value;
        hasValue = true;
      }
    });
    if (hasValue) rows.push(raw);
  });

  return rows;
}
