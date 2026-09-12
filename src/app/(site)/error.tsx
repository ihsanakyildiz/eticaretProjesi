"use client";

export default function SiteError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="mx-auto max-w-xl px-4 py-20 text-center">
      <h1 className="font-display text-2xl font-bold text-site-fg">Sayfa yüklenemedi</h1>
      <p className="mt-3 text-sm leading-relaxed text-site-muted">
        Geçici bir hata oluştu. Lütfen tekrar deneyin.
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="mt-6 rounded-md bg-site-primary px-4 py-2.5 text-sm font-semibold text-white"
      >
        Yeniden dene
      </button>
    </section>
  );
}
