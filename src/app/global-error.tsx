"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="tr">
      <head>
        <title>Sayfa yüklenemedi</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0, background: "#fff" }}>
        <main style={{ maxWidth: 40 * 16, margin: "4rem auto", padding: "0 1.25rem" }}>
          <h1 style={{ fontSize: "1.5rem" }}>Sayfa yüklenemedi</h1>
          <p style={{ color: "#475569", lineHeight: 1.6 }}>
            Geçici bir hata oluştu. Lütfen sayfayı yenileyin.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              marginTop: "1rem",
              border: 0,
              borderRadius: 8,
              background: "#0f172a",
              color: "#fff",
              padding: "0.65rem 1rem",
              fontWeight: 600,
            }}
          >
            Yeniden dene
          </button>
        </main>
      </body>
    </html>
  );
}
