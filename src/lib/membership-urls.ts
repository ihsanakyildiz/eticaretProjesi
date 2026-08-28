/** Client-safe membership URL helpers (no server imports). */

export function membershipLoginHref(callbackUrl: string): string {
  const cb =
    callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")
      ? callbackUrl
      : "/uye";
  return `/giris?callbackUrl=${encodeURIComponent(cb)}`;
}

export function membershipRegisterHref(callbackUrl?: string): string {
  if (!callbackUrl) return "/kayit";
  const cb =
    callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")
      ? callbackUrl
      : "/uye";
  return `/kayit?callbackUrl=${encodeURIComponent(cb)}`;
}

/**
 * Üyelik açıksa ve oturum yoksa /giris’e yönlendirir;
 * giriş sonrası kullanıcıyı hedef adrese döndürür.
 */
export function resolveMembershipGatedHref(options: {
  membershipEnabled: boolean;
  isAuthenticated: boolean;
  destination: string;
}): string {
  const raw = options.destination.trim() || "/iletisim";
  const destination =
    raw.startsWith("/") && !raw.startsWith("//") ? raw : "/iletisim";

  if (options.membershipEnabled && !options.isAuthenticated) {
    return membershipLoginHref(destination);
  }

  return destination;
}
