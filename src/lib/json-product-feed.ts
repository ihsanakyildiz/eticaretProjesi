import "server-only";

import {
  detectXmlItemPath,
  extractXmlItems,
  previewMappedFeedItems,
} from "@/lib/xml-product-feed";
import {
  XML_FEED_MAX_ITEMS,
  type XmlFeedCategoryAlias,
  type XmlFeedFieldMapping,
  type XmlFeedPreviewResult,
} from "@/lib/xml-product-feed-shared";

export function parseJsonDocument(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("API yanıtı boş.");
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    throw new Error("API JSON döndürmedi. Yanıt JSON olmalı.");
  }
}

export function detectJsonItemPath(root: unknown) {
  return detectXmlItemPath(root);
}

export function extractJsonItems(root: unknown, itemPath: string) {
  return extractXmlItems(root, itemPath);
}

export function previewJsonFeed(
  jsonText: string,
  itemPathInput: string,
  mappingInput: XmlFeedFieldMapping,
  categoryAliases: XmlFeedCategoryAlias[],
  brandAliases: XmlFeedCategoryAlias[] = [],
  variantPathInput = "",
): XmlFeedPreviewResult {
  const root = parseJsonDocument(jsonText);
  const itemPath = itemPathInput.trim() || detectJsonItemPath(root);
  const items = extractJsonItems(root, itemPath);
  return previewMappedFeedItems(
    items,
    itemPath,
    variantPathInput,
    mappingInput,
    categoryAliases,
    brandAliases,
  );
}

export function capJsonFeedItems(items: Record<string, unknown>[]) {
  if (items.length > XML_FEED_MAX_ITEMS) return items.slice(0, XML_FEED_MAX_ITEMS);
  return items;
}
