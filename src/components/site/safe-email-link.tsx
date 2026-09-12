"use client";

import { useEffect, useState } from "react";

/**
 * Cloudflare e-posta gizleme SSR HTML’deki mailto/adresi değiştirir.
 * Hidrasyon bozulunca Lighthouse `__next_error__` belgesi görür (title/lang yok).
 */
export function SafeEmailLink({
  email,
  className,
  fallback = "E-posta",
}: {
  email: string;
  className?: string;
  fallback?: string;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  return (
    <a
      href={ready ? `mailto:${email}` : undefined}
      className={className}
      suppressHydrationWarning
    >
      {ready ? email : fallback}
    </a>
  );
}
