import { headers } from "next/headers";

export function ipFromRequestHeaders(headerStore: Headers): string {
  const forwarded = headerStore.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return toIpv4(first);
  }
  const realIp = headerStore.get("x-real-ip")?.trim();
  if (realIp) return toIpv4(realIp);
  return "127.0.0.1";
}

function toIpv4(ip: string): string {
  const trimmed = ip.trim();
  if (!trimmed || trimmed === "::1" || trimmed.toLowerCase() === "localhost") return "127.0.0.1";
  if (trimmed.toLowerCase().startsWith("::ffff:")) return toIpv4(trimmed.slice(7));
  if (trimmed.includes(":") && !/^\d{1,3}(?:\.\d{1,3}){3}$/.test(trimmed)) return "127.0.0.1";
  return trimmed;
}

export async function getClientIp(): Promise<string> {
  return ipFromRequestHeaders(await headers());
}
