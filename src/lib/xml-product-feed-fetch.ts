import "server-only";

import { XML_FEED_MAX_BYTES } from "@/lib/xml-product-feed-shared";
import { assertPublicHttpUrl } from "@/lib/public-http-url";

export async function fetchXmlFeedText(url: string, httpUser?: string | null, httpPass?: string | null) {
  const parsed = await assertPublicHttpUrl(url.trim(), "XML adresi");
  const headers: Record<string, string> = {
    Accept: "application/xml, text/xml, */*",
    "User-Agent": "EticaretXmlFeed/1.0 (+https://localhost)",
  };
  if (httpUser?.trim()) {
    const token = Buffer.from(`${httpUser}:${httpPass ?? ""}`).toString("base64");
    headers.Authorization = `Basic ${token}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60_000);
  try {
    const response = await fetch(parsed.toString(), {
      headers,
      redirect: "follow",
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`XML adresi yanıt vermedi (${response.status}).`);
    }
    const length = Number(response.headers.get("content-length") ?? "0");
    if (Number.isFinite(length) && length > XML_FEED_MAX_BYTES) {
      throw new Error("XML dosyası 25 MB sınırını aşıyor.");
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > XML_FEED_MAX_BYTES) {
      throw new Error("XML dosyası 25 MB sınırını aşıyor.");
    }
    return buffer.toString("utf8");
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("XML adresi zaman aşımına uğradı.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
