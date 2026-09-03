import "server-only";

import { XMLParser } from "fast-xml-parser";
import type { ProductImportColumnKey, ProductImportRawRow } from "@/lib/product-import";
import {
  applyCategoryAlias,
  XML_FEED_MAX_ITEMS,
  XML_FEED_PREVIEW_ITEMS,
  XML_FEED_TARGET_FIELDS,
  XML_FEED_WRITE_BATCH,
  XML_FEED_WRITE_ROW_BUDGET,
  type XmlFeedFieldMapping,
  type XmlFeedCategoryAlias,
  type XmlFeedPreviewResult,
  type XmlFeedTargetKey,
  type XmlPreviewMappedRow,
} from "@/lib/xml-product-feed-shared";

const UNIQUE_VALUE_LIMIT = 400;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@",
  textNodeName: "#text",
  trimValues: true,
  parseTagValue: false,
  parseAttributeValue: false,
  removeNSPrefix: false,
});

const PRODUCT_LIKE_KEYS = [
  "title",
  "name",
  "urunadi",
  "urun_adi",
  "productname",
  "barkod",
  "barcode",
  "ean",
  "gtin",
  "fiyat",
  "price",
  "stok",
  "stock",
  "quantity",
  "sku",
  "stokkodu",
];

const FIELD_ALIASES: Record<XmlFeedTargetKey, string[]> = {
  title: ["title", "name", "urunadi", "urunadii", "urun_adi", "productname", "product_name", "g:title", "baslik"],
  barcode: ["barcode", "barkod", "ean", "gtin", "g:gtin", "g:id", "barcodeid"],
  sku: [
    "sku",
    "stockcode",
    "stokkodu",
    "stok_kodu",
    "urun_kodu",
    "productcode",
    "code",
    "stokkod",
    "suppliercode",
    "varyantkodu",
    "varyant_kodu",
    "variantcode",
    "variantsku",
  ],
  externalId: [
    "id",
    "productid",
    "product_id",
    "urunid",
    "urun_id",
    "xmlid",
    "xml_id",
    "supplierproductid",
    "apiproductid",
    "urunkartiid",
    "urunkartid",
  ],
  productKey: [
    "productkey",
    "urun_kodu",
    "urunkodu",
    "modelkodu",
    "model",
    "grupkodu",
    "anaurunkodu",
    "urungrupkodu",
    "productgroupid",
    "product_group_id",
  ],
  price: ["price", "fiyat", "satis_fiyati", "satisfiyati", "g:price", "listefiyati", "kdvharic"],
  discount: [
    "discount",
    "discountprice",
    "discountedprice",
    "sale_price",
    "g:sale_price",
    "indirimlifiyat",
    "indirimli_fiyat",
    "indirimlifiyati",
    "indirimli",
    "specialprice",
    "kampanyafiyati",
    "indirimfiyati",
  ],
  compareAt: [
    "compareat",
    "piyasafiyati",
    "oldprice",
    "original_price",
    "originalprice",
  ],
  cost: ["cost", "maliyet", "alis", "alisfiyati", "buyingprice", "tedarikfiyat"],
  taxRate: ["tax", "taxrate", "kdv", "vat", "kdv_orani"],
  stock: ["stock", "stok", "quantity", "qty", "adet", "stokadedi", "g:availability", "availability"],
  availableForOrder: [
    "status",
    "salestatus",
    "sale_status",
    "availablefororder",
    "sipariseacik",
    "satisdurumu",
    "published",
    "enabled",
    "visibility",
    "durum",
  ],
  category: ["category", "kategori", "kategoriadi", "categoryname", "g:product_type", "producttype"],
  brand: ["brand", "marka", "g:brand", "manufacturer", "uretici"],
  supplier: ["supplier", "suppliername", "tedarikci", "vendor"],
  summary: ["summary", "short", "kisaaciklama", "shortdescription", "g:description"],
  content: ["description", "aciklama", "content", "detail", "detay", "uzunaciklama", "g:description"],
  imageUrl: [
    "image",
    "imageurl",
    "image_url",
    "image_link",
    "g:image_link",
    "resim",
    "resimler",
    "picture",
    "photo",
    "images",
    "image1",
    "image_1",
    "image_url_1",
    "image_url_2",
    "image_url_3",
    "thumbnail",
    "cover",
    "photourl",
  ],
  mpn: ["mpn", "g:mpn"],
  gtin: ["gtin", "g:gtin"],
  upc: ["upc"],
  weightKg: ["weight", "agirlik", "g:shipping_weight", "kg"],
  widthCm: ["width", "en", "genislik"],
  heightCm: ["height", "boy"],
  depthCm: ["depth", "yukseklik", "derinlik"],
  seoTitle: ["seotitle", "seo_baslik", "metatitle"],
  seoDescription: ["seodescription", "seo_aciklama", "metadescription"],
  option1Name: [
    "option1name",
    "optionname",
    "attributename",
    "ozellik1",
    "ozellikadi",
    "eksecenekadi",
    "secenekadi",
  ],
  option1Value: [
    "option1value",
    "optionvalue",
    "attributevalue",
    "size",
    "beden",
    "bedenadi",
    "sizes",
    "varyant",
    "ebat",
    "olcu",
    "ölçü",
    "boyut",
    "dimension",
    "eksecenekdeger",
    "secenekdeger",
  ],
  option2Name: ["option2name", "ozellik2"],
  option2Value: ["option2value", "color", "colour", "renk", "renkadi", "colorname"],
  option3Name: ["option3name", "ozellik3"],
  option3Value: ["option3value", "material", "materyal", "fabric", "kumas"],
};

const VARIANT_ARRAY_TOKENS = [
  "variants",
  "variations",
  "variation",
  "variant",
  "skus",
  "children",
  "childproducts",
  "subproducts",
  "subproduct",
  "alturunler",
  "alturun",
  "urunvaryant",
  "urunvaryantlari",
  "urunvaryantlar",
  "varyantlar",
  "varyantlistesi",
  "varyantlist",
  "productvariants",
  "skulist",
  "stoklar",
  "kombinasyonlar",
  "kombinasyon",
  "urunsecenek",
  "urunsecenekleri",
  "secenek",
  "secenekler",
];

const VARIANT_SKIP_ARRAY_TOKENS = [
  "images",
  "image",
  "photos",
  "pictures",
  "resimler",
  "gallery",
  "categories",
  "tags",
  "breadcrumbs",
  "ozellikler",
  "ozellik",
  "files",
  "documents",
];

const VARIANT_IDENTITY_SKIP = new Set<XmlFeedTargetKey>([
  "title",
  "category",
  "brand",
  "content",
  "summary",
  "productKey",
  "externalId",
  "supplier",
  "seoTitle",
  "seoDescription",
]);

const OPTION_AXES = [
  { tokens: ["varyant", "ebat", "olcu", "ölçü", "boyut", "dimension"], name: "Ebat" },
  { tokens: ["size", "beden", "sizes", "bedenadi", "sizeid"], name: "Beden" },
  { tokens: ["color", "colour", "renk", "colorname", "renkadi", "colorid"], name: "Renk" },
  { tokens: ["material", "materyal", "fabric", "kumas"], name: "Materyal" },
] as const;

const VARIANT_LEVEL_FIELDS = new Set<XmlFeedTargetKey>([
  "sku",
  "barcode",
  "price",
  "stock",
  "discount",
  "compareAt",
  "cost",
  "taxRate",
  "imageUrl",
  "option1Name",
  "option1Value",
  "option2Name",
  "option2Value",
  "option3Name",
  "option3Value",
]);

function stripNs(key: string) {
  const colon = key.lastIndexOf(":");
  return colon >= 0 ? key.slice(colon + 1) : key;
}

function normalizeToken(value: string) {
  return stripNs(value)
    .toLocaleLowerCase("tr-TR")
    .replace(/[^a-z0-9]+/g, "");
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function resolveKey(record: Record<string, unknown>, key: string): unknown {
  if (key in record) return record[key];
  const wanted = normalizeToken(key);
  for (const [candidate, value] of Object.entries(record)) {
    if (normalizeToken(candidate) === wanted) return value;
  }
  return undefined;
}

export function parseXmlDocument(xml: string): unknown {
  if (!xml.trim()) throw new Error("XML içeriği boş.");
  return parser.parse(xml);
}

function walkPath(root: unknown, path: string): unknown {
  if (!path.trim()) return root;
  let current = root;
  for (const segment of path.split(".").map((part) => part.trim()).filter(Boolean)) {
    if (current == null) return undefined;
    if (Array.isArray(current)) {
      current = current.length === 1 ? current[0] : current;
    }
    if (!isPlainObject(current)) return undefined;
    current = resolveKey(current, segment);
  }
  return current;
}

function asItemArray(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    return value.filter(isPlainObject);
  }
  if (isPlainObject(value)) return [value];
  return [];
}

function productLikeScore(item: Record<string, unknown>) {
  const keys = Object.keys(item).map(normalizeToken);
  let score = 0;
  for (const key of keys) {
    if (PRODUCT_LIKE_KEYS.includes(key)) score += 3;
    if (key.includes("fiyat") || key.includes("price")) score += 2;
    if (key.includes("stok") || key.includes("stock")) score += 2;
    if (key.includes("barkod") || key.includes("barcode")) score += 2;
  }
  score += Math.min(8, keys.length);
  return score;
}

type PathCandidate = { path: string; count: number; score: number };

function collectArrayCandidates(value: unknown, path: string, out: PathCandidate[]) {
  if (Array.isArray(value)) {
    const objects = value.filter(isPlainObject);
    if (objects.length > 0) {
      out.push({
        path,
        count: objects.length,
        score: productLikeScore(objects[0]) + Math.min(40, objects.length),
      });
    }
    if (objects[0]) collectArrayCandidates(objects[0], path, out);
    return;
  }
  if (!isPlainObject(value)) return;
  for (const [key, child] of Object.entries(value)) {
    if (key.startsWith("@") || key === "#text") continue;
    const next = path ? `${path}.${key}` : key;
    if (isPlainObject(child) && productLikeScore(child) >= 6) {
      out.push({ path: next, count: 1, score: productLikeScore(child) });
    }
    collectArrayCandidates(child, next, out);
  }
}

export function detectXmlItemPath(root: unknown): string {
  const candidates: PathCandidate[] = [];
  collectArrayCandidates(root, "", candidates);
  if (candidates.length === 0) return "";
  candidates.sort((a, b) => b.score - a.score || b.count - a.count);
  return candidates[0]?.path ?? "";
}

export function extractXmlItems(root: unknown, itemPath: string): Record<string, unknown>[] {
  const resolved = itemPath.trim() ? walkPath(root, itemPath) : root;
  const items = asItemArray(resolved);
  if (items.length > XML_FEED_MAX_ITEMS) {
    return items.slice(0, XML_FEED_MAX_ITEMS);
  }
  return items;
}

function collectLeaves(value: unknown): string[] {
  if (value == null) return [];
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    const text = String(value).trim();
    return text ? [text] : [];
  }
  if (Array.isArray(value)) return value.flatMap(collectLeaves);
  if (!isPlainObject(value)) return [];

  const text = value["#text"];
  const textValue = text == null ? "" : String(text).trim();
  const preferredAttrs = ["@url", "@href", "@src", "@value"]
    .map((key) => value[key])
    .filter((item) => item != null)
    .map((item) => String(item).trim())
    .filter(Boolean);
  if (textValue || preferredAttrs.length > 0) {
    return textValue ? [textValue, ...preferredAttrs] : preferredAttrs;
  }
  return Object.entries(value)
    .filter(([key]) => key !== "#text")
    .flatMap(([, child]) => collectLeaves(child));
}

export function extractXmlPathValue(item: Record<string, unknown>, path: string) {
  if (!path.trim()) return "";
  const value = walkPath(item, path);
  const leaves = collectLeaves(value);
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const leaf of leaves) {
    if (seen.has(leaf)) continue;
    seen.add(leaf);
    unique.push(leaf);
  }
  return unique.join(" | ");
}

function sampleValueForPath(item: Record<string, unknown>, path: string, variantPath: string) {
  if (variantPath && pathIsUnder(path, variantPath) && path !== variantPath) {
    const first = extractXmlVariantItems(item, variantPath)[0];
    const relative = pathRelative(path, variantPath);
    if (first && relative) {
      return extractXmlPathValue(first, relative).split(/\s*\|\s*/)[0] ?? "";
    }
  }
  return extractXmlPathValue(item, path).split(/\s*\|\s*/)[0] ?? "";
}

export function listXmlItemPaths(item: Record<string, unknown>, prefix = "", depth = 0): string[] {
  if (depth > 6) return [];
  const paths: string[] = [];
  for (const [key, value] of Object.entries(item)) {
    if (key === "#text") continue;
    const next = prefix ? `${prefix}.${key}` : key;
    if (key.startsWith("@")) {
      paths.push(next);
      continue;
    }
    if (value == null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      paths.push(next);
      continue;
    }
    if (Array.isArray(value)) {
      paths.push(next);
      const first = value.find(isPlainObject);
      if (first) paths.push(...listXmlItemPaths(first, next, depth + 1));
      continue;
    }
    if (isPlainObject(value)) {
      if ("#text" in value || Object.keys(value).every((itemKey) => itemKey.startsWith("@") || itemKey === "#text")) {
        paths.push(next);
      }
      paths.push(...listXmlItemPaths(value, next, depth + 1));
    }
  }
  return [...new Set(paths)];
}

function suggestFieldForPath(path: string): XmlFeedTargetKey | null {
  const last = (path.split(".").pop() ?? path).replace(/^@/, "");
  const token = normalizeToken(last);
  if (/^(image|imageurl|resim|photo|picture|img)\d+$/.test(token)) return "imageUrl";
  if (token === "id" && !last.includes(":")) return "externalId";
  for (const field of XML_FEED_TARGET_FIELDS) {
    if (FIELD_ALIASES[field.key].some((alias) => normalizeToken(alias) === token)) {
      return field.key;
    }
  }
  return null;
}

function isOptionBagPath(path: string) {
  return path.split(".").some((segment) => {
    const token = normalizeToken(segment.replace(/^@/, ""));
    return ["ozellikler", "ozellik", "options", "attributes", "optionvalues", "specs", "properties"].includes(token);
  });
}

export function suggestXmlMapping(paths: string[], variantPath = ""): XmlFeedFieldMapping {
  const mapping: XmlFeedFieldMapping = {};
  const claimed = new Set<XmlFeedTargetKey>();
  const nested = variantPath.trim()
    ? paths.filter((path) => pathIsUnder(path, variantPath) && path !== variantPath.trim())
    : [];
  const parent = variantPath.trim()
    ? paths.filter((path) => !pathIsUnder(path, variantPath))
    : paths;

  function assign(path: string, preferred: Set<XmlFeedTargetKey> | null) {
    if (isOptionBagPath(path)) return;
    const field = suggestFieldForPath(path);
    if (!field) return;
    if (preferred && !preferred.has(field)) return;
    if (field !== "imageUrl" && claimed.has(field)) return;
    mapping[path] = field;
    claimed.add(field);
  }

  for (const path of nested) assign(path, VARIANT_LEVEL_FIELDS);
  for (const path of parent) assign(path, null);
  for (const path of nested) assign(path, null);
  return mapping;
}

function pathIsUnder(path: string, prefix: string) {
  const head = prefix.trim();
  if (!head) return false;
  return path === head || path.startsWith(`${head}.`);
}

function pathRelative(path: string, prefix: string) {
  const head = prefix.trim();
  if (path === head) return "";
  return path.slice(head.length + 1);
}

function lastPathToken(path: string) {
  return normalizeToken((path.split(".").pop() ?? path).replace(/^@/, ""));
}

function isSkippedVariantArray(path: string) {
  return VARIANT_SKIP_ARRAY_TOKENS.includes(lastPathToken(path));
}

function isKnownVariantArray(path: string) {
  return VARIANT_ARRAY_TOKENS.includes(lastPathToken(path));
}

function variantLikeScore(item: Record<string, unknown>) {
  const keys = Object.keys(item).map(normalizeToken);
  let score = 0;
  for (const key of keys) {
    if (["sku", "stokkodu", "urunkodu", "barcode", "barkod", "ean", "gtin", "varyantkodu"].includes(key)) {
      score += 3;
    }
    if (["price", "fiyat", "saleprice", "satisfiyati", "satisfiyat"].includes(key)) score += 2;
    if (["stock", "stok", "quantity", "qty", "adet", "stokadedi"].includes(key)) score += 2;
    if (["size", "beden", "color", "renk", "colour", "material", "materyal", "varyant", "ebat", "olcu", "boyut"].includes(key)) {
      score += 4;
    }
    if (["options", "attributes", "optionvalues", "ozellikler", "eksecenekadi", "eksecenekdeger"].includes(key)) {
      score += 3;
    }
  }
  if (keys.every((key) => key.includes("url") || key.includes("src") || key.includes("image") || key.includes("resim"))) {
    return 0;
  }
  return score;
}

function findInnerVariantArray(item: Record<string, unknown>): Record<string, unknown>[] {
  return findInnerVariantArrayEntry(item)?.items ?? [];
}

function findInnerVariantArrayEntry(
  item: Record<string, unknown>,
): { key: string; items: Record<string, unknown>[] } | null {
  for (const [key, child] of Object.entries(item)) {
    if (key.startsWith("@") || key === "#text") continue;
    const objects = asItemArray(child);
    if (objects.length > 0 && variantLikeScore(objects[0]) >= 3) {
      if (objects.length > 1 || isKnownVariantArray(key)) {
        return { key, items: objects };
      }
    }
  }
  return null;
}

function collectVariantPathCandidates(value: unknown, path: string, out: PathCandidate[]) {
  if (Array.isArray(value)) {
    const objects = value.filter(isPlainObject);
    if (objects.length > 0 && !isSkippedVariantArray(path)) {
      const score = variantLikeScore(objects[0]);
      const known = isKnownVariantArray(path) ? 8 : 0;
      if (score + known >= 5) {
        out.push({ path, count: objects.length, score: score + known + Math.min(20, objects.length) });
      }
    }
    if (objects[0]) collectVariantPathCandidates(objects[0], path, out);
    return;
  }
  if (!isPlainObject(value)) return;
  for (const [key, child] of Object.entries(value)) {
    if (key.startsWith("@") || key === "#text") continue;
    const next = path ? `${path}.${key}` : key;
    if (isPlainObject(child) && !Array.isArray(child) && !isSkippedVariantArray(next)) {
      const inner = findInnerVariantArrayEntry(child);
      if (inner) {
        const innerPath = `${next}.${inner.key}`;
        const score = variantLikeScore(inner.items[0]) + (isKnownVariantArray(innerPath) || isKnownVariantArray(next) ? 8 : 0);
        if (score >= 5) {
          out.push({
            path: innerPath,
            count: inner.items.length,
            score: score + Math.min(20, inner.items.length),
          });
        }
      } else if (isKnownVariantArray(next) && variantLikeScore(child) >= 3) {
        out.push({ path: next, count: 1, score: variantLikeScore(child) + 8 });
      }
    }
    collectVariantPathCandidates(child, next, out);
  }
}

export function detectXmlVariantPath(item: Record<string, unknown>): string {
  const candidates: PathCandidate[] = [];
  collectVariantPathCandidates(item, "", candidates);
  if (candidates.length === 0) return "";
  candidates.sort((a, b) => b.score - a.score || b.count - a.count);
  return candidates[0]?.path ?? "";
}

export function listXmlVariantPathCandidates(item: Record<string, unknown>) {
  const candidates: PathCandidate[] = [];
  collectVariantPathCandidates(item, "", candidates);
  const seen = new Set<string>();
  return candidates
    .sort((a, b) => b.score - a.score || b.count - a.count)
    .map((item) => item.path)
    .filter((path) => {
      if (seen.has(path)) return false;
      seen.add(path);
      return true;
    })
    .slice(0, 12);
}

export function extractXmlVariantItems(
  item: Record<string, unknown>,
  variantPath: string,
): Record<string, unknown>[] {
  if (!variantPath.trim()) return [];
  const value = walkPath(item, variantPath);
  const direct = asItemArray(value);
  if (direct.length > 1) return direct;
  if (direct.length === 1) {
    const nested = findInnerVariantArray(direct[0]);
    if (nested.length > 0) return nested;
    if (variantLikeScore(direct[0]) >= 3) return direct;
  }
  return [];
}

function splitMappingForVariants(mapping: XmlFeedFieldMapping, variantPath: string) {
  if (!variantPath.trim()) {
    return { parent: mapping, variant: {} as XmlFeedFieldMapping };
  }
  const parent: XmlFeedFieldMapping = {};
  const variant: XmlFeedFieldMapping = {};
  for (const [path, field] of Object.entries(mapping)) {
    if (pathIsUnder(path, variantPath)) {
      const relative = pathRelative(path, variantPath);
      if (relative) variant[relative] = field;
    } else {
      parent[path] = field;
    }
  }
  return { parent, variant };
}

function suggestVariantMapping(paths: string[]): XmlFeedFieldMapping {
  const mapping = suggestXmlMapping(paths);
  for (const [path, field] of Object.entries(mapping)) {
    if (VARIANT_IDENTITY_SKIP.has(field)) delete mapping[path];
  }
  return mapping;
}

function leafText(value: unknown) {
  return collectLeaves(value)[0] ?? "";
}

function recordAttr(item: Record<string, unknown>, names: string[]) {
  for (const name of names) {
    const text = leafText(item[name] ?? item[`@${name}`] ?? resolveKey(item, name) ?? resolveKey(item, `@${name}`));
    if (text) return text;
  }
  return "";
}

function flattenOptionItems(raw: unknown): Record<string, unknown>[] {
  const items = asItemArray(raw);
  const out: Record<string, unknown>[] = [];
  for (const item of items) {
    if (recordAttr(item, ["name", "option", "attribute", "key", "title", "ad", "adi", "tanim", "label"])) {
      out.push(item);
      continue;
    }
    let expanded = false;
    for (const [key, child] of Object.entries(item)) {
      if (key.startsWith("@") || key === "#text") continue;
      const nested = asItemArray(child);
      if (nested.length === 0) continue;
      expanded = true;
      out.push(...nested);
    }
    if (!expanded) out.push(item);
  }
  return out;
}

function readNamedOptions(record: Record<string, unknown>) {
  const out: Array<{ name: string; value: string }> = [];
  const pairName = recordAttr(record, ["eksecenekadi", "secenekadi", "ozellikadi", "optionname"]);
  const pairValue = recordAttr(record, ["eksecenekdeger", "secenekdeger", "ozellikdeger", "optionvalue"]);
  if (pairName && pairValue) out.push({ name: pairName.slice(0, 80), value: pairValue.slice(0, 191) });

  for (const key of ["options", "attributes", "optionvalues", "specs", "ozellikler", "properties"]) {
    const items = flattenOptionItems(resolveKey(record, key));
    for (const item of items) {
      const name = recordAttr(item, ["name", "option", "attribute", "key", "title", "ad", "adi", "tanim", "label"]);
      const value = recordAttr(item, ["value", "option_value", "val", "text", "#text", "deger", "degeri"]);
      if (name && value) out.push({ name: name.slice(0, 80), value: value.slice(0, 191) });
    }
  }
  return out;
}

function readAxisOptions(record: Record<string, unknown>) {
  const out: Array<{ name: string; value: string }> = [];
  for (const axis of OPTION_AXES) {
    for (const token of axis.tokens) {
      const value = leafText(resolveKey(record, token));
      if (!value) continue;
      out.push({ name: axis.name, value: value.slice(0, 191) });
      break;
    }
  }
  return out;
}

function fillOptionSlot(row: ProductImportRawRow, index: 1 | 2 | 3, name: string, value: string) {
  const nameKey = (`option${index}Name`) as "option1Name" | "option2Name" | "option3Name";
  const valueKey = (`option${index}Value`) as "option1Value" | "option2Value" | "option3Value";
  if ((row[valueKey] ?? "").trim()) {
    if (!(row[nameKey] ?? "").trim()) row[nameKey] = name;
    return false;
  }
  if ((row[nameKey] ?? "").trim() && (row[nameKey] ?? "").trim() !== name) return false;
  row[nameKey] = name;
  row[valueKey] = value;
  return true;
}

function nextEmptyOptionIndex(row: ProductImportRawRow): 1 | 2 | 3 | null {
  if (!(row.option1Value ?? "").trim()) return 1;
  if (!(row.option2Value ?? "").trim()) return 2;
  if (!(row.option3Value ?? "").trim()) return 3;
  return null;
}

function inferVariantOptions(
  row: ProductImportRawRow,
  source: Record<string, unknown>,
  variantIndex: number,
  variantCount: number,
) {
  const inferred = [...readAxisOptions(source), ...readNamedOptions(source)];
  for (const option of inferred) {
    for (const index of [1, 2, 3] as const) {
      const nameKey = (`option${index}Name`) as "option1Name" | "option2Name" | "option3Name";
      const valueKey = (`option${index}Value`) as "option1Value" | "option2Value" | "option3Value";
      if ((row[valueKey] ?? "").trim() !== option.value) continue;
      if (!(row[nameKey] ?? "").trim()) row[nameKey] = option.name;
    }
  }
  for (const option of inferred) {
    const values = [row.option1Value, row.option2Value, row.option3Value].map((value) =>
      (value ?? "").trim(),
    );
    if (values.includes(option.value)) continue;
    const names = [row.option1Name, row.option2Name, row.option3Name].map((name) =>
      (name ?? "").trim().toLocaleLowerCase("tr-TR"),
    );
    const namedIndex = names.findIndex((name) => name === option.name.toLocaleLowerCase("tr-TR"));
    if (namedIndex === 0) fillOptionSlot(row, 1, option.name, option.value);
    else if (namedIndex === 1) fillOptionSlot(row, 2, option.name, option.value);
    else if (namedIndex === 2) fillOptionSlot(row, 3, option.name, option.value);
    else {
      const slot = nextEmptyOptionIndex(row);
      if (slot) fillOptionSlot(row, slot, option.name, option.value);
    }
  }
  if ((row.option1Value ?? "").trim() && !(row.option1Name ?? "").trim()) {
    const value = (row.option1Value ?? "").trim();
    row.option1Name = /^\d+([.,]\d+)?\s*[x×]\s*\d+/i.test(value) ? "Ebat" : "Varyant";
  }
  if ((row.option2Value ?? "").trim() && !(row.option2Name ?? "").trim()) row.option2Name = "Özellik 2";
  if ((row.option3Value ?? "").trim() && !(row.option3Name ?? "").trim()) row.option3Name = "Özellik 3";
  if (variantCount > 1 && !(row.option1Value ?? "").trim()) {
    row.option1Name = "Varyant";
    row.option1Value = ((row.sku ?? row.barcode ?? `${variantIndex + 1}`) || "").slice(0, 191);
  }
}

function mergeImageUrls(parent: string | undefined, variant: string | undefined) {
  const urls = [...(parent ?? "").split(/\n+/), ...(variant ?? "").split(/\n+/)]
    .map((item) => item.trim())
    .filter(Boolean);
  return [...new Set(urls)].join("\n");
}

function parentGroupKey(
  item: Record<string, unknown>,
  parentRow: ProductImportRawRow,
  fallback: string,
) {
  const groupId = leafText(
    resolveKey(item, "product_group_id") ??
      resolveKey(item, "productGroupId") ??
      resolveKey(item, "grupkodu") ??
      resolveKey(item, "anaurunkodu") ??
      resolveKey(item, "urungrupkodu") ??
      resolveKey(item, "modelkodu"),
  );
  if (groupId && groupId !== "0") return groupId.slice(0, 80);
  const parentId =
    (parentRow.externalId ?? "").trim() ||
    leafText(
      resolveKey(item, "urunkartiid") ??
        resolveKey(item, "id") ??
        resolveKey(item, "productId") ??
        resolveKey(item, "product_id") ??
        resolveKey(item, "urunid"),
    );
  if (parentId) return parentId.slice(0, 80);
  const parentSku = (parentRow.productKey ?? parentRow.sku ?? "").trim();
  if (parentSku) return parentSku.slice(0, 80);
  return fallback.slice(0, 80);
}

function mergeParentVariantRow(
  parent: ProductImportRawRow,
  variant: ProductImportRawRow,
): ProductImportRawRow {
  const merged: ProductImportRawRow = { ...parent, ...variant, rowNumber: variant.rowNumber };
  if (!(variant.title ?? "").trim()) merged.title = parent.title;
  if (!(variant.category ?? "").trim()) merged.category = parent.category;
  if (!(variant.brand ?? "").trim()) merged.brand = parent.brand;
  if (!(variant.content ?? "").trim()) merged.content = parent.content;
  if (!(variant.summary ?? "").trim()) merged.summary = parent.summary;
  if (!(variant.imageUrl ?? "").trim()) merged.imageUrl = parent.imageUrl;
  else merged.imageUrl = mergeImageUrls(parent.imageUrl, variant.imageUrl);
  if (!(variant.price ?? "").trim()) merged.price = parent.price;
  if (!(variant.discount ?? "").trim()) merged.discount = parent.discount;
  if (!(variant.compareAt ?? "").trim()) merged.compareAt = parent.compareAt;
  if (!(variant.cost ?? "").trim()) merged.cost = parent.cost;
  merged.productKey = parent.productKey;
  if (!(variant.barcode ?? "").trim()) {
    merged.barcode = "";
  }
  return merged;
}

function finalizeFeedRow(
  row: ProductImportRawRow,
  source: Record<string, unknown>,
  variantIndex: number,
  variantCount: number,
  parentKey: string,
) {
  if (!row.externalId?.trim()) {
    const rawId = leafText(resolveKey(source, "id") ?? resolveKey(source, "productId"));
    if (rawId) row.externalId = rawId.slice(0, 191);
  }
  row.productKey = (parentKey || row.productKey || row.externalId || "").slice(0, 80);
  inferVariantOptions(row, source, variantIndex, variantCount);
  if (!row.barcode?.trim()) {
    const sku = (row.sku ?? "").trim();
    row.barcode = (sku || `${row.productKey}-${variantIndex + 1}`).slice(0, 64);
  }
  return row;
}

function variantLabelForRow(row: ProductImportRawRow) {
  return [row.option1Value, row.option2Value, row.option3Value]
    .map((value) => (value ?? "").trim())
    .filter(Boolean)
    .join(" / ");
}

export function mapFeedItemToRawRows(
  item: Record<string, unknown>,
  startRowNumber: number,
  mapping: XmlFeedFieldMapping,
  categoryAliases: XmlFeedCategoryAlias[],
  brandAliases: XmlFeedCategoryAlias[] = [],
  variantPathInput = "",
): ProductImportRawRow[] {
  const variantPath = variantPathInput.trim() || detectXmlVariantPath(item);
  const variants = extractXmlVariantItems(item, variantPath);
  const { parent: parentMapping, variant: variantMappingInput } = splitMappingForVariants(mapping, variantPath);
  const parentRow = mapXmlItemToRawRow(item, startRowNumber, parentMapping, categoryAliases, brandAliases);
  const parentKey = parentGroupKey(item, parentRow, `p${startRowNumber}`);
  parentRow.productKey = parentKey;

  if (variants.length === 0) {
    return [finalizeFeedRow(parentRow, item, 0, 1, parentKey)];
  }

  return variants.map((variant, index) => {
    const autoMapping = suggestVariantMapping(listXmlItemPaths(variant));
    const variantMapping = { ...autoMapping, ...variantMappingInput };
    const variantRow = mapXmlItemToRawRow(
      variant,
      startRowNumber + index,
      variantMapping,
      categoryAliases,
      brandAliases,
    );
    const merged = mergeParentVariantRow(parentRow, variantRow);
    merged.rowNumber = startRowNumber + index;
    merged.productKey = parentKey;
    return finalizeFeedRow(merged, variant, index, variants.length, parentKey);
  });
}

export function countFeedVariantRows(items: Record<string, unknown>[], variantPath: string) {
  if (!variantPath.trim()) return items.length;
  let count = 0;
  for (const item of items) {
    const variants = extractXmlVariantItems(item, variantPath);
    count += Math.max(1, variants.length);
  }
  return count;
}

function feedItemVariantCount(item: Record<string, unknown>, variantPath: string) {
  const path = variantPath.trim() || detectXmlVariantPath(item);
  if (!path) return 1;
  return Math.max(1, extractXmlVariantItems(item, path).length);
}

export function takeFeedItemSlice(
  items: Record<string, unknown>[],
  offset: number,
  variantPath: string,
  maxItems = XML_FEED_WRITE_BATCH,
  maxRows = XML_FEED_WRITE_ROW_BUDGET,
) {
  const slice: Record<string, unknown>[] = [];
  let rows = 0;
  for (let index = offset; index < items.length; index += 1) {
    const item = items[index];
    const weight = feedItemVariantCount(item, variantPath);
    if (slice.length > 0 && (slice.length >= maxItems || rows + weight > maxRows)) break;
    slice.push(item);
    rows += weight;
    if (slice.length >= maxItems) break;
  }
  return slice;
}

function collectUniqueMappedValues(
  items: Record<string, unknown>[],
  mapping: XmlFeedFieldMapping,
  field: XmlFeedTargetKey,
) {
  const paths = Object.entries(mapping)
    .filter(([, target]) => target === field)
    .map(([path]) => path);
  if (paths.length === 0) return [];
  const values = new Set<string>();
  for (const item of items) {
    for (const path of paths) {
      const value = extractXmlPathValue(item, path).trim();
      if (value) values.add(value);
      if (values.size >= UNIQUE_VALUE_LIMIT) break;
    }
    if (values.size >= UNIQUE_VALUE_LIMIT) break;
  }
  return [...values].sort((left, right) => left.localeCompare(right, "tr"));
}

export function previewMappedFeedItems(
  items: Record<string, unknown>[],
  itemPath: string,
  variantPathInput: string,
  mappingInput: XmlFeedFieldMapping,
  categoryAliases: XmlFeedCategoryAlias[],
  brandAliases: XmlFeedCategoryAlias[] = [],
): XmlFeedPreviewResult {
  const sample = items[0] ?? {};
  const xmlPaths = items.length > 0 ? listXmlItemPaths(sample) : [];
  const variantPath = variantPathInput.trim() || (sample ? detectXmlVariantPath(sample) : "");
  const variantPathCandidates = sample ? listXmlVariantPathCandidates(sample) : [];
  const autoMapping = suggestXmlMapping(xmlPaths, variantPath);
  const suggestedMapping =
    Object.keys(mappingInput).length > 0 ? { ...autoMapping, ...mappingInput } : autoMapping;
  const xmlTags = xmlPaths
    .filter((path) => path !== variantPath)
    .map((path) => ({
      path,
      sample: sampleValueForPath(sample, path, variantPath).slice(0, 160),
    }));
  const sampleRows: XmlPreviewMappedRow[] = [];
  let rowNumber = 1;
  for (const item of items) {
    if (sampleRows.length >= XML_FEED_PREVIEW_ITEMS) break;
    const rows = mapFeedItemToRawRows(
      item,
      rowNumber,
      suggestedMapping,
      categoryAliases,
      brandAliases,
      variantPath,
    );
    for (const row of rows) {
      if (sampleRows.length >= XML_FEED_PREVIEW_ITEMS) break;
      const images = (row.imageUrl ?? "").split(/\n+/).filter(Boolean);
      sampleRows.push({
        rowNumber: sampleRows.length + 1,
        title: (row.title ?? "").slice(0, 80),
        barcode: row.barcode ?? "",
        sku: row.sku ?? "",
        price: row.price ?? "",
        discount: row.discount ?? "",
        stock: row.stock ?? "",
        category: row.category ?? "",
        brand: row.brand ?? "",
        imageCount: images.length,
        variantLabel: variantLabelForRow(row),
      });
    }
    rowNumber += rows.length;
  }
  return {
    itemPath,
    variantPath,
    variantPathCandidates:
      variantPath && !variantPathCandidates.includes(variantPath)
        ? [variantPath, ...variantPathCandidates]
        : variantPathCandidates,
    itemCount: items.length,
    variantRowCount: countFeedVariantRows(items, variantPath),
    xmlPaths,
    xmlTags,
    suggestedMapping,
    xmlCategories: collectUniqueMappedValues(items, suggestedMapping, "category"),
    xmlBrands: collectUniqueMappedValues(items, suggestedMapping, "brand"),
    sampleRows,
  };
}

export function mapXmlItemToRawRow(
  item: Record<string, unknown>,
  rowNumber: number,
  mapping: XmlFeedFieldMapping,
  categoryAliases: XmlFeedCategoryAlias[],
  brandAliases: XmlFeedCategoryAlias[] = [],
): ProductImportRawRow {
  const row: ProductImportRawRow = { rowNumber };
  const collected: Partial<Record<XmlFeedTargetKey, string[]>> = {};
  for (const [path, field] of Object.entries(mapping)) {
    if (!path.trim()) continue;
    const value = extractXmlPathValue(item, path);
    if (!value) continue;
    const parts = field === "imageUrl" ? value.split(/\s*\|\s*/).filter(Boolean) : [value];
    collected[field] = [...(collected[field] ?? []), ...parts];
  }
  for (const field of XML_FEED_TARGET_FIELDS) {
    const values = collected[field.key];
    if (!values || values.length === 0) continue;
    const uniqueValues = [...new Set(values.map((value) => value.trim()).filter(Boolean))];
    let joined =
      field.key === "imageUrl"
        ? values.join("\n")
        : field.key === "externalId" ||
            field.key === "sku" ||
            field.key === "barcode" ||
            field.key === "productKey"
          ? (uniqueValues[0] ?? "")
          : uniqueValues.length <= 1
            ? (uniqueValues[0] ?? "")
            : uniqueValues.join(" | ");
    if (field.key === "category") joined = applyCategoryAlias(joined, categoryAliases);
    if (field.key === "brand") joined = applyCategoryAlias(joined, brandAliases);
    if (field.key === "externalId") {
      row.externalId = joined.slice(0, 191);
      continue;
    }
    row[field.key as ProductImportColumnKey] = joined;
  }
  return row;
}

export function previewXmlFeed(
  xml: string,
  itemPathInput: string,
  mappingInput: XmlFeedFieldMapping,
  categoryAliases: XmlFeedCategoryAlias[],
  brandAliases: XmlFeedCategoryAlias[] = [],
  variantPathInput = "",
): XmlFeedPreviewResult {
  const root = parseXmlDocument(xml);
  const itemPath = itemPathInput.trim() || detectXmlItemPath(root);
  const items = extractXmlItems(root, itemPath);
  return previewMappedFeedItems(
    items,
    itemPath,
    variantPathInput,
    mappingInput,
    categoryAliases,
    brandAliases,
  );
}
