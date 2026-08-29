import type { NextAuthConfig } from "next-auth";

/** Edge middleware’de @prisma/client kullanılamaz — string karşılaştır */
const ADMIN = "ADMIN";
const STAFF = "STAFF";
const MEMBER = "MEMBER";

export const authConfig = {
  // Apache/Hestia reverse proxy: Host header AUTH_URL ile birebir eşleşmezse
  // Auth.js UntrustedHost fırlatır ve giriş sayfası Application error verir.
  trustHost: true,
  pages: {
    // Üye varsayılanı; admin rotaları authorized içinde /admin/login’e yönlendirilir
    signIn: "/giris",
    error: "/giris",
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7,
  },
  providers: [],
  callbacks: {
    // Edge’de JWT’deki id/role’ü session’a yaz (Prisma yok)
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id ? String(token.id) : String(token.sub ?? "");
        if (token.role === ADMIN || token.role === STAFF || token.role === MEMBER) {
          session.user.role = token.role;
        }
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const userId = auth?.user?.id?.trim();
      const isLoggedIn = Boolean(userId);
      const role = auth?.user?.role;
      const path = nextUrl.pathname;
      const isAdminRoute = path === "/admin" || path.startsWith("/admin/");
      const isAdminLogin = path === "/admin/login";
      const isMemberArea = path === "/uye" || path.startsWith("/uye/");
      const isCheckout = path === "/odeme" || path.startsWith("/odeme/");
      const isSiteAuth =
        path === "/giris" ||
        path === "/kayit" ||
        path === "/sifremi-unuttum" ||
        path === "/sifre-sifirla";

      if (isAdminLogin) {
        // Edge JWT tek başına ADMIN sayıp /admin’e atmasın.
        // Aksi halde sunucu oturumu (Prisma/DB) düştüğünde login ↔ admin döngüsü oluşur.
        // Gerçek ADMIN kontrolünü login sayfası / panel layout yapar.
        if (isLoggedIn && role === MEMBER) {
          return Response.redirect(new URL("/uye", nextUrl));
        }
        return true;
      }

      if (isAdminRoute) {
        if (!isLoggedIn || (role !== ADMIN && role !== STAFF)) {
          return Response.redirect(new URL("/admin/login", nextUrl));
        }
        return true;
      }

      if (isMemberArea || isCheckout) {
        if (!isLoggedIn) {
          return Response.redirect(
            new URL(`/giris?callbackUrl=${encodeURIComponent(path + nextUrl.search)}`, nextUrl),
          );
        }
        return true;
      }

      if (isSiteAuth && isLoggedIn) {
        if (role === ADMIN || role === STAFF) {
          return Response.redirect(new URL("/admin", nextUrl));
        }
        return Response.redirect(new URL("/uye", nextUrl));
      }

      return true;
    },
  },
} satisfies NextAuthConfig;
