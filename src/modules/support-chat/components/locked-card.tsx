import Link from "next/link";

export function SupportChatLockedCard() {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
      <p className="font-semibold">Bu sayfa lisanslı sohbet modülü gerektirir.</p>
      <p className="mt-2">
        Satın aldığınız lisans anahtarını girin. Lisans olmadan gelen kutusu ve kanal bağlantıları
        kapalıdır; mağaza çalışmaya devam eder.
      </p>
      <Link
        href="/admin/settings/support/ayarlar"
        className="mt-3 inline-flex rounded-md bg-[#405189] px-3 py-2 text-xs font-semibold text-white hover:bg-[#364574]"
      >
        Ayarlar sayfasına git
      </Link>
    </div>
  );
}
