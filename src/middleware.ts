import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

/** Server Action CSRF: Origin ile x-forwarded-host www / www’siz uyuşmazlığını giderir */
const TRUSTED_SITE_HOSTS = new Set([
  "www.ihsanakyildiz.com.tr",
  "ihsanakyildiz.com.tr",
  "localhost:3000",
  "localhost:3001",
  "127.0.0.1:3000",
  "127.0.0.1:3001",
]);

export default auth((req) => {
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", req.nextUrl.pathname);

  const origin = req.headers.get("origin");
  if (origin) {
    try {
      const originHost = new URL(origin).host;
      if (TRUSTED_SITE_HOSTS.has(originHost)) {
        requestHeaders.set("x-forwarded-host", originHost);
      }
    } catch {
      /* ignore invalid Origin */
    }
  }

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
});

export const config = {
  matcher: [
    "/admin",
    "/admin/:path*",
    "/uye",
    "/uye/:path*",
    "/giris",
    "/kayit",
    "/sifremi-unuttum",
    "/sifre-sifirla",
  ],
};
