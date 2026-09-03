import "server-only";

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

function isBlockedIp(address: string) {
  const value = address.trim().toLowerCase();
  const mapped = value.startsWith("::ffff:") ? value.slice(7) : value;
  if (mapped === "127.0.0.1" || mapped === "::1" || mapped === "0.0.0.0" || mapped === "localhost") {
    return true;
  }
  if (mapped.startsWith("10.")) return true;
  if (mapped.startsWith("192.168.")) return true;
  if (mapped.startsWith("169.254.")) return true;
  const match172 = mapped.match(/^172\.(\d+)\./);
  if (match172) {
    const octet = Number(match172[1]);
    if (octet >= 16 && octet <= 31) return true;
  }
  if (mapped.startsWith("fc") || mapped.startsWith("fd") || mapped.startsWith("fe80")) return true;
  return false;
}

export async function assertPublicHttpUrl(raw: string, label = "Adres") {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`${label} geçersiz.`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`${label} http(s) olmalıdır.`);
  }
  const host = parsed.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || isBlockedIp(host)) {
    throw new Error("Yerel veya özel ağ adresi kullanılamaz.");
  }
  if (isIP(host)) {
    if (isBlockedIp(host)) throw new Error("Yerel veya özel ağ adresi kullanılamaz.");
    return parsed;
  }
  const resolved = await lookup(host, { all: true });
  if (resolved.length === 0 || resolved.some((item) => isBlockedIp(item.address))) {
    throw new Error(`${label} çözümlenemedi veya özel ağa işaret ediyor.`);
  }
  return parsed;
}
