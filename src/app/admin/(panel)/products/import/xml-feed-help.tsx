"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { CircleHelp, X } from "lucide-react";

const SECTIONS = [
  { id: "nedir", label: "Ne işe yarar?" },
  { id: "liste", label: "Kaynak listesi" },
  { id: "kaynak", label: "1. Kaynak" },
  { id: "esleme", label: "2. Alan eşleme" },
  { id: "varyant", label: "Varyantlı ürünler" },
  { id: "kategori", label: "3. Kategori ve marka" },
  { id: "kurallar", label: "4. Senkron kuralları" },
  { id: "calistir", label: "Kaydet ve çalıştır" },
  { id: "sorun", label: "Sık karşılaşılanlar" },
] as const;

export function XmlFeedHelpButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-md border border-[#e9ebec] bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        <CircleHelp className="h-4 w-4 text-[#405189]" />
        XML yardım
      </button>
      {open ? <XmlFeedHelpModal onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function XmlFeedHelpModal({ onClose }: { onClose: () => void }) {
  const titleId = useId();
  const bodyRef = useRef<HTMLDivElement>(null);

  function goTo(id: string) {
    const target = bodyRef.current?.querySelector(`#xml-help-${id}`);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" aria-label="Kapat" className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex max-h-[min(92vh,880px)] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-[#e9ebec] bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#e9ebec] px-5 py-4">
          <div>
            <h2 id={titleId} className="text-base font-semibold text-slate-800">
              XML ile ürün çekme
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Tedarikçi XML’inden ürün almak için adım adım kılavuz. Formdaki numaralarla aynıdır.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <nav className="shrink-0 overflow-x-auto border-b border-[#e9ebec] bg-slate-50 md:w-56 md:overflow-y-auto md:border-r md:border-b-0">
            <ul className="flex gap-1 p-3 md:flex-col">
              {SECTIONS.map((section) => (
                <li key={section.id} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => goTo(section.id)}
                    className="block w-full rounded-md px-3 py-2 text-left text-xs font-medium text-slate-600 hover:bg-white hover:text-slate-800 md:text-sm"
                  >
                    {section.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <div
            ref={bodyRef}
            className="min-h-0 flex-1 space-y-8 overflow-y-auto px-5 py-5 text-sm leading-6 text-slate-600"
          >
            <HelpSection id="nedir" title="Ne işe yarar?">
              <p>
                XML kaynağı, tedarikçinin ürün listesini düzenli aralıklarla mağazanıza çeker. Excel
                yüklemesi gibi tarayıcıya bağlı değildir: kaydettikten sonra sunucu (XAMPP / Next)
                açık kaldığı sürece çalışır.
              </p>
              <ul className="mt-3 list-disc space-y-1 pl-5">
                <li>
                  <strong className="font-medium text-slate-800">API’den farkı:</strong> XML bir dosya
                  adresidir. API ise JSON döndüren bir HTTP isteğidir.
                </li>
                <li>Her tedarikçi için ayrı kaynak açın. Adres ve alan eşlemesi kaynağa özeldir.</li>
                <li>
                  Çalışmasını istemediğiniz firmayı listeden{" "}
                  <strong className="font-medium text-slate-800">Pasif</strong> yapın. Eşleme silinmez.
                </li>
              </ul>
            </HelpSection>

            <HelpSection id="liste" title="Kaynak listesi">
              <p>
                <code className="rounded bg-slate-100 px-1">/admin/products/import/xml</code> sayfasında
                kayıtlı firmalar görünür. Eşleme o kaynağın kendi sayfasındadır.
              </p>
            </HelpSection>

            <HelpSection id="kaynak" title="1. Kaynak">
              <p>XML adresini yazıp «XML’i çek ve alanları keşfet» deyin. Kimlik gerekiyorsa HTTP kullanıcı / parola ekleyin.</p>
            </HelpSection>

            <HelpSection id="esleme" title="2. Alan eşleme">
              <p>
                Keşif sonrası iki tablo oluşur. Üst düğüm ürün bilgisi, alt dizi her SKU’dur. Soldaki
                XML etiketi sağdaki mağaza alanına bağlanır. Satış fiyatı normal listedir;
                İndirimli satış doluysa müşteri onu öder, satış sitede üstü çizili görünür.
                Alış yalnızca maliyettir, sitede görünmez.
              </p>
              <ul className="mt-3 list-disc space-y-1.5 pl-5">
                <li>
                  <strong className="font-medium text-slate-800">Ürün düğümü:</strong> ürünlerin listesi
                  (ör. <code className="rounded bg-slate-100 px-1">Urunler.Urun</code>).
                </li>
                <li>
                  <strong className="font-medium text-slate-800">Varyant dizisi:</strong> her ebat / renk
                  / beden satırı (ör. <code className="rounded bg-slate-100 px-1">UrunSecenek.Secenek</code>
                  veya <code className="rounded bg-slate-100 px-1">Variants.Variant</code>).
                </li>
                <li>
                  Barkod veya SKU yoksa eşleme anahtarı genelde{" "}
                  <strong className="font-medium text-slate-800">Ürün ID</strong> (UrunKartiID) olur.
                </li>
              </ul>
            </HelpSection>

            <HelpSection id="varyant" title="Varyantlı ürünler">
              <p>
                Doğru yapı: <strong className="font-medium text-slate-800">bir ürün kartı + altında N
                SKU</strong>. Üst kayıt adı / açıklama / kategori / marka taşır; her alt etiket kendi
                barkodu, fiyatı ve stoğu ile ayrı varyant olur.
              </p>
              <p className="mt-3 font-medium text-slate-800">İç içe XML (önerilen)</p>
              <pre className="mt-2 overflow-x-auto rounded-md bg-slate-50 p-3 text-xs text-slate-700">{`<Urun>
  <UrunKartiID>196270</UrunKartiID>
  <UrunAdi>Mutfak Halısı</UrunAdi>
  <Kategori>Kaymaz Taban Halılar</Kategori>
  <UrunSecenek>
    <Secenek>
      <StokKodu>MGZ-50x100</StokKodu>
      <Barkod>8683151236768</Barkod>
      <SatisFiyati>131.25</SatisFiyati>
      <IndirimliFiyat>99.90</IndirimliFiyat>
      <AlisFiyati>72.00</AlisFiyati>
      <StokAdedi>100</StokAdedi>
      <Ozellikler>
        <Ozellik Ad="Ebat">50 x 100</Ozellik>
      </Ozellikler>
    </Secenek>
  </UrunSecenek>
</Urun>`}</pre>
              <ul className="mt-3 list-disc space-y-1.5 pl-5">
                <li>
                  Ürün düğümü: <code className="rounded bg-slate-100 px-1">Urunler.Urun</code>
                </li>
                <li>
                  Varyant dizisi: <code className="rounded bg-slate-100 px-1">UrunSecenek.Secenek</code>
                </li>
                <li>
                  <code className="rounded bg-slate-100 px-1">&lt;UrunAdi&gt;</code> → Ürün adı
                </li>
                <li>
                  <code className="rounded bg-slate-100 px-1">Secenek.StokKodu</code> → SKU
                </li>
                <li>
                  <code className="rounded bg-slate-100 px-1">Secenek.Barkod</code> → Barkod
                </li>
                <li>
                  <code className="rounded bg-slate-100 px-1">Secenek.SatisFiyati</code> → Satış fiyatı
                </li>
                <li>
                  <code className="rounded bg-slate-100 px-1">Secenek.IndirimliFiyat</code> → İndirimli
                  satış fiyatı (yoksa boş bırakın)
                </li>
                <li>
                  <code className="rounded bg-slate-100 px-1">Secenek.AlisFiyati</code> → Alış fiyatı
                </li>
                <li>
                  <code className="rounded bg-slate-100 px-1">Secenek.StokAdedi</code> → Stok
                </li>
                <li>
                  <code className="rounded bg-slate-100 px-1">&lt;Ozellik Ad="Ebat"&gt;</code> otomatik
                  Ebat özelliği olur; eşlemenize gerek yoktur.
                </li>
              </ul>
              <p className="mt-3 font-medium text-slate-800">Düz XML (her satır bir SKU)</p>
              <p className="mt-1">
                Varyant dizisi yoksa alanı boş bırakın. Aynı ürünü birleştirmek için üst{" "}
                <code className="rounded bg-slate-100 px-1">GrupKodu</code> /{" "}
                <code className="rounded bg-slate-100 px-1">UrunKartiID</code> etiketini «Ürün kodu»
                veya «Ürün ID»ye bağlayın; beden / renk / ebat etiketlerini özellik değerine bağlayın.
              </p>
              <p className="mt-3">
                12 ebatlı halı tek ürün + 12 SKU olarak yüklenir.{" "}
                <code className="rounded bg-slate-100 px-1">&lt;varyant&gt;</code> bir dizi adı değil,
                ebat metni olabilir (ör. 50 x 100).
              </p>
            </HelpSection>

            <HelpSection id="kategori" title="3. Kategori ve marka eşlemesi">
              <p>
                XML’deki metinler mağaza kategorisi / markası ile birebir aynı olmayabilir. Her değer
                için mağazadaki kaydı seçin. Eşlenmeyen satırda varsayılan kategori / marka kullanılır.
              </p>
            </HelpSection>

            <HelpSection id="kurallar" title="4. Senkron kuralları">
              <dl className="space-y-3">
                <HelpTerm title="Ürün eşleme anahtarı">
                  Sonraki çalışmalarda aynı satırın aynı ürüne bağlanmasını sağlar. Barkod, SKU, ürün
                  kodu veya XML ürün ID. Yanlış anahtar çift ürün üretir.
                </HelpTerm>
                <HelpTerm title="SKU öneki">
                  Tedarikçi kodlarının çakışmaması için başa eklenir.
                </HelpTerm>
                <HelpTerm title="Eşleşmeyen satırları yeni ürün olarak ekle">
                  Anahtarı mağazada bulunamayan satırlar yeni ürün olur. Kapalıysa yalnızca mevcut
                  ürünler güncellenir.
                </HelpTerm>
              </dl>
            </HelpSection>

            <HelpSection id="calistir" title="Kaydet ve çalıştır">
              <ol className="list-decimal space-y-1.5 pl-5">
                <li>Eşlemeyi kontrol edin, Kaydet’e basın.</li>
                <li>
                  Hemen denemek için <strong className="font-medium text-slate-800">Şimdi çalıştır</strong>{" "}
                  (kaynak aktif olmalı).
                </li>
                <li>
                  İlerleme sunucu işidir. Sayfayı kapatabilirsiniz; XAMPP / Next kapanırsa yeniden
                  açılınca kaldığı yerden sürer.
                </li>
              </ol>
            </HelpSection>

            <HelpSection id="sorun" title="Sık karşılaşılanlar">
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong className="font-medium text-slate-800">Tek ürün, tek SKU geldi:</strong>{" "}
                  varyant dizisi yolu boş veya yanlış. XML’i yeniden çekin; yol genelde otomatik dolar
                  (UrunSecenek.Secenek, Variants.Variant, urun_varyant.varyant).
                </li>
                <li>
                  <strong className="font-medium text-slate-800">12 ebat ayrı ürün oldu:</strong> ürün
                  birleştirme anahtarı yok. Üst <code className="rounded bg-slate-100 px-1">UrunKartiID</code>{" "}
                  / grup kodunu Ürün ID veya Ürün koduna eşleyin; varyant yolunu doldurun.
                </li>
                <li>
                  <strong className="font-medium text-slate-800">Özellikler boş:</strong> Ticimax{" "}
                  <code className="rounded bg-slate-100 px-1">&lt;Ozellik Ad="Renk"&gt;</code> otomatik
                  okunur. Düz etiketse Beden / Renk / Ebat alanını özellik değerine bağlayın.
                </li>
                <li>
                  <strong className="font-medium text-slate-800">Çift ürün:</strong> eşleme anahtarı
                  boş veya her SKU’da değişiyor. Sabit bir kart ID / barkod bağlayın.
                </li>
              </ul>
            </HelpSection>
          </div>
        </div>
      </div>
    </div>
  );
}

function HelpSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={`xml-help-${id}`} className="scroll-mt-3">
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function HelpTerm({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <dt className="font-medium text-slate-800">{title}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}
