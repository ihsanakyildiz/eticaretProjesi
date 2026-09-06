"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { CircleHelp, X } from "lucide-react";

const SECTIONS = [
  { id: "nedir", label: "Ne işe yarar?" },
  { id: "liste", label: "Kaynak listesi" },
  { id: "kaynak", label: "1. Kaynak" },
  { id: "dokuman", label: "Doküman ve OpenAPI" },
  { id: "esleme", label: "2. Alan eşleme" },
  { id: "varyant", label: "Varyantlı ürünler" },
  { id: "kategori", label: "3. Kategori ve marka" },
  { id: "kurallar", label: "4. Senkron kuralları" },
  { id: "calistir", label: "Kaydet ve çalıştır" },
  { id: "sorun", label: "Sık karşılaşılanlar" },
] as const;

export function ApiFeedHelpButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-md border border-[#e9ebec] bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        <CircleHelp className="h-4 w-4 text-[#405189]" />
        API yardım
      </button>
      {open ? <ApiFeedHelpModal onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function ApiFeedHelpModal({ onClose }: { onClose: () => void }) {
  const titleId = useId();
  const bodyRef = useRef<HTMLDivElement>(null);

  function goTo(id: string) {
    const target = bodyRef.current?.querySelector(`#api-help-${id}`);
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
              API ile ürün çekme
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Tedarikçi JSON API’sinden ürün almak için adım adım kılavuz. Formdaki numaralarla aynıdır.
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
                API kaynağı, tedarikçinin ürün listesini düzenli aralıklarla mağazanıza çeker. Excel
                yüklemesi gibi tarayıcıya bağlı değildir: kaydettikten sonra sunucu (XAMPP / Next)
                açık kaldığı sürece çalışır.
              </p>
              <ul className="mt-3 list-disc space-y-1 pl-5">
                <li>
                  <strong className="font-medium text-slate-800">XML’den farkı:</strong> XML bir dosya
                  adresidir. API ise JSON döndüren bir HTTP isteğidir (GET veya POST).
                </li>
                <li>
                  Her tedarikçi için ayrı kaynak açın. Adres, kimlik bilgisi ve alan eşlemesi kaynağa
                  özeldir.
                </li>
                <li>
                  Çalışmasını istemediğiniz firmayı listeden <strong className="font-medium text-slate-800">Pasif</strong>{" "}
                  yapın. Eşleme silinmez; yalnızca senkron durur.
                </li>
              </ul>
            </HelpSection>

            <HelpSection id="liste" title="Kaynak listesi">
              <p>
                <code className="rounded bg-slate-100 px-1">/admin/products/import/api</code> sayfasında
                kayıtlı firmalar görünür.
              </p>
              <ul className="mt-3 list-disc space-y-1.5 pl-5">
                <li>
                  <strong className="font-medium text-slate-800">API kaynağı ekle:</strong> yeni firma
                  formu açılır.
                </li>
                <li>
                  <strong className="font-medium text-slate-800">Aktif / Pasif:</strong> yeşil düğme
                  anında kaydedilir. Pasifte zamanlanmış çalışma durur, bekleyen kuyruk iptal edilir,
                  <em> Çalıştır</em> kapanır.
                </li>
                <li>
                  <strong className="font-medium text-slate-800">Eşleme:</strong> o kaynağın ayar
                  sayfasına gider.
                </li>
                <li>
                  <strong className="font-medium text-slate-800">Çalıştır:</strong> sıradaki senkronu
                  hemen başlatır. Yalnızca aktif kaynaklarda açıktır.
                </li>
              </ul>
            </HelpSection>

            <HelpSection id="kaynak" title="1. Kaynak">
              <p>Formun ilk bölümü bağlantıyı tanımlar. Önce burayı doldurup API’yi çekin.</p>
              <dl className="mt-3 space-y-3">
                <HelpTerm title="Kaynak aktif">
                  Kapalıyken (pasif) otomatik senkron ve Şimdi çalıştır durur. Eşlemeyi değiştirmeye
                  ve kaydetmeye devam edebilirsiniz. Değişikliğin kalıcı olması için Kaydet’e basın.
                </HelpTerm>
                <HelpTerm title="Firma / kaynak adı">
                  Sadece sizin listenizde görünür. Örnek: “A Firması API”.
                </HelpTerm>
                <HelpTerm title="Tedarikçi kaydı">
                  Mağazadaki tedarikçi kartına bağlar. “API’de olmayanları siparişe kapat” ve benzeri
                  kurallar yalnızca bu tedarikçiye bağlı ürünlerde çalışır.
                </HelpTerm>
                <HelpTerm title="API adresi">
                  Ürün <em>listesinin</em> JSON adresi olmalıdır. Tek ürün (`/products/1`), sepet veya
                  kullanıcı adresi kataloğu doldurmaz. Doküman sayfası da yazılabilir; sonraki bölümde
                  anlatılır.
                </HelpTerm>
                <HelpTerm title="HTTP yöntemi">
                  Çoğu tedarikçi <strong className="font-medium text-slate-800">GET</strong> kullanır.
                  Listeyi gövdeyle (JSON) isteyen sistemlerde POST seçin ve gövdeyi doldurun.
                </HelpTerm>
                <HelpTerm title="Kimlik doğrulama">
                  Yok, Bearer token, HTTP Basic, özel header veya URL parametresi. Token’ı buraya
                  yazın; kayıttan sonra formda boş görünür, değiştirmek istemezseniz boş bırakın.
                </HelpTerm>
                <HelpTerm title="Sayfalama">
                  Tüm ürünler tek yanıtta geliyorsa sayfa parametresini boş bırakın. Büyük kataloglarda
                  dokümandaki ada göre doldurun: <code className="rounded bg-slate-100 px-1">page</code>,{" "}
                  <code className="rounded bg-slate-100 px-1">offset</code>,{" "}
                  <code className="rounded bg-slate-100 px-1">limit</code>. Keşif yalnızca ilk sayfayı
                  okur; asıl senkron “En fazla sayfa” kadar sayfa çeker.
                </HelpTerm>
                <HelpTerm title="API’yi çek ve alanları keşfet">
                  Adrese istek atar, JSON alanlarını listeler ve mümkün olan eşlemeleri önerir. Asıl
                  ürün aktarımı bu düğmeyle olmaz; yalnızca önizlemedir. Senkron Kaydet / Şimdi
                  çalıştır ile başlar.
                </HelpTerm>
              </dl>
            </HelpSection>

            <HelpSection id="dokuman" title="Doküman ve OpenAPI">
              <p>
                Bazı firmalar size hazır bir ürün XML’i vermez; Swagger / Redoc / OpenAPI dokümanı
                verir. Örnek: Fake Store’daki{" "}
                <code className="rounded bg-slate-100 px-1">https://fakestoreapi.com/docs</code>
              </p>
              <p className="mt-2">
                Doküman sayfasını API adresine yazıp çekin. Sistem OpenAPI spec’i bulur ve GET
                endpoint listesini gösterir. <strong className="font-medium text-slate-800">Get all
                products</strong> gibi liste satırını seçin (önerilen yeşil etiket). Adres ve alan
                önerileri doldurulur, ardından gerçek ürün JSON’u çekilir.
              </p>
              <ul className="mt-3 list-disc space-y-1.5 pl-5">
                <li>
                  Kullanın: tüm ürünleri getiren GET, örneğin{" "}
                  <code className="rounded bg-slate-100 px-1">/products</code>
                </li>
                <li>
                  Kullanmayın: <code className="rounded bg-slate-100 px-1">/products/{"{id}"}</code>{" "}
                  (tek ürün), sepet, kullanıcı, giriş.
                </li>
                <li>
                  Spec’i doğrudan de verebilirsiniz:{" "}
                  <code className="rounded bg-slate-100 px-1">/openapi.json</code>,{" "}
                  <code className="rounded bg-slate-100 px-1">/swagger.json</code>,{" "}
                  <code className="rounded bg-slate-100 px-1">/docs-data</code>
                </li>
              </ul>
            </HelpSection>

            <HelpSection id="esleme" title="2. Alan eşleme">
              <p>
                Soldaki JSON yolu, sağdaki mağaza alanına bağlanır. Keşif sonrası satırlar otomatik
                dolar; yanlış olanı değiştirin.
              </p>
              <ul className="mt-3 list-disc space-y-1.5 pl-5">
                <li>
                  <strong className="font-medium text-slate-800">Ürün düğümü (item path):</strong>{" "}
                  ürün nesnelerinin listelendiği yol. Kök dizi için boş kalabilir. Sarmalanmış
                  yanıtlarda örneğin <code className="rounded bg-slate-100 px-1">data.products</code>.
                </li>
                <li>
                  <code className="rounded bg-slate-100 px-1">title</code> /{" "}
                  <code className="rounded bg-slate-100 px-1">name</code> → Ürün adı (yeni üründe
                  zorunlu)
                </li>
                <li>
                  <code className="rounded bg-slate-100 px-1">price</code> → Satış fiyatı
                </li>
                <li>
                  <code className="rounded bg-slate-100 px-1">sale_price</code> /{" "}
                  <code className="rounded bg-slate-100 px-1">discount</code> → İndirimli satış fiyatı
                  (doluysa müşteri bunu öder; satış üstü çizili)
                </li>
                <li>
                  <code className="rounded bg-slate-100 px-1">cost</code> /{" "}
                  <code className="rounded bg-slate-100 px-1">buying_price</code> → Alış fiyatı
                </li>
                <li>
                  <code className="rounded bg-slate-100 px-1">image</code> → Görseller (birden fazla
                  görsel alanı aynı “Görseller”e bağlanabilir)
                </li>
                <li>
                  <code className="rounded bg-slate-100 px-1">id</code> → Ürün ID (tedarikçinin
                  kimliği; mağazanın iç cuid değeri değil)
                </li>
                <li>
                  <code className="rounded bg-slate-100 px-1">description</code> → Açıklama
                </li>
                <li>
                  Barkod veya SKU yoksa eşleme anahtarı genelde <strong className="font-medium text-slate-800">API ürün ID</strong>{" "}
                  olur.
                </li>
              </ul>
              <p className="mt-3">
                5. adımdaki “Güncellenecek alanlar” hangi bilgilerin sonraki senkronlarda üzerine
                yazılacağını seçer. Kapalı alanlar yalnızca ilk eklemede gelir.
              </p>
            </HelpSection>

            <HelpSection id="varyant" title="Varyantlı ürünler">
              <p>
                Alkapida tarzı yanıtlarda ürün <code className="rounded bg-slate-100 px-1">data[]</code>{" "}
                içindedir; ebatlar <code className="rounded bg-slate-100 px-1">variants[]</code>{" "}
                dizisindedir. Üst kayıt ürün adı / kategori; her dizi elemanı ayrı SKU’dur.
              </p>
              <p className="mt-3 font-medium text-slate-800">Bu örnek için otomatik eşleme</p>
              <ul className="mt-2 list-disc space-y-1.5 pl-5">
                <li>
                  Ürün düğümü: <code className="rounded bg-slate-100 px-1">data</code>
                </li>
                <li>
                  Varyant dizisi: <code className="rounded bg-slate-100 px-1">variants</code>
                </li>
                <li>
                  <code className="rounded bg-slate-100 px-1">name</code> → Ürün adı
                </li>
                <li>
                  <code className="rounded bg-slate-100 px-1">description</code> → Açıklama
                </li>
                <li>
                  <code className="rounded bg-slate-100 px-1">category</code> /{" "}
                  <code className="rounded bg-slate-100 px-1">brand</code> → Kategori / Marka
                </li>
                <li>
                  <code className="rounded bg-slate-100 px-1">variants.sku</code> → SKU
                </li>
                <li>
                  <code className="rounded bg-slate-100 px-1">variants.barcode</code> → Barkod
                </li>
                <li>
                  <code className="rounded bg-slate-100 px-1">variants.price</code> → Satış fiyatı
                </li>
                <li>
                  <code className="rounded bg-slate-100 px-1">variants.sale_price</code> → İndirimli
                  satış fiyatı
                </li>
                <li>
                  <code className="rounded bg-slate-100 px-1">variants.stock</code> → Stok
                </li>
                <li>
                  <code className="rounded bg-slate-100 px-1">variants.varyant</code> → Özellik 1
                  değeri (Ebat, örn. 50 x 100)
                </li>
                <li>
                  <code className="rounded bg-slate-100 px-1">variants.image_url_1</code> … → Görseller
                </li>
              </ul>
              <p className="mt-3">
                <code className="rounded bg-slate-100 px-1">varyant</code> bir dizi adı değil, ebat
                metnidir. 12 ebatlı halı tek ürün + 12 SKU olarak yüklenir. Üstteki{" "}
                <code className="rounded bg-slate-100 px-1">id</code> ürünü birleştirir; her SKU’nun
                kendi barkodu / fiyatı / stoğu vardır.
              </p>
            </HelpSection>

            <HelpSection id="kategori" title="3. Kategori ve marka eşlemesi">
              <p>
                API’deki metinler (ör. “Elektronik”, “mens clothing”) mağaza kategorisi / markası
                ile birebir aynı olmayabilir. Her değer için mağazadaki kaydı seçin.
              </p>
              <ul className="mt-3 list-disc space-y-1.5 pl-5">
                <li>
                  Liste, kategori ve marka alanlarını eşleyip API’yi çektikten sonra dolar.
                </li>
                <li>
                  Eşlenmeyen satırda <strong className="font-medium text-slate-800">varsayılan
                  kategori / marka</strong> kullanılır.
                </li>
                <li>
                  Yeni ürün eklemek için ya kategori alanı eşlenmeli ya da varsayılan kategori
                  seçilmelidir.
                </li>
              </ul>
            </HelpSection>

            <HelpSection id="kurallar" title="4. Senkron kuralları">
              <dl className="space-y-3">
                <HelpTerm title="Ürün eşleme anahtarı">
                  Sonraki çalışmalarda aynı satırın aynı ürüne bağlanmasını sağlar. Barkod, SKU, ürün
                  kodu veya API ürün ID. Anahtarı 2. adımda bir JSON alanına eşleyin. Yanlış anahtar
                  çift ürün üretir.
                </HelpTerm>
                <HelpTerm title="SKU öneki">
                  Tedarikçi kodlarının çakışmaması için başa eklenir. Örnek: A- + 15 → A-15.
                </HelpTerm>
                <HelpTerm title="Fiyat artışı ve yuvarlama">
                  API fiyatının üzerine yüzde ekler; isteğe bağlı tam sayı veya ,99 yuvarlar.
                </HelpTerm>
                <HelpTerm title="API fiyatı KDV dahil">
                  Mağazada fiyat KDV hariç saklanır. API KDV’li gönderiyorsa bu anahtarı açık tutun.
                </HelpTerm>
                <HelpTerm title="Çalışma aralığı">
                  Kaynak aktifken bir sonraki otomatik senkronun ne kadar sonra geleceği.
                </HelpTerm>
                <HelpTerm title="Eşleşmeyen satırları yeni ürün olarak ekle">
                  Anahtarı mağazada bulunamayan satırlar yeni ürün olur. Kapalıysa yalnızca mevcut
                  ürünler güncellenir.
                </HelpTerm>
                <HelpTerm title="API’de olmayanları siparişe kapat">
                  Bu tedarikçiye bağlı olup bu sefer listede gelmeyen ürünler silinmez; siparişe
                  kapanır.
                </HelpTerm>
                <HelpTerm title="Stok limiti / stokta kalmadığında">
                  Limitin altındaki stok satışa kapanabilir. 0 = limit yok. Ön sipariş seçiliyse ürün
                  açık kalır. API stok göndermiyorsa stok 0 gelebilir; “Stoğu sıfır olanları kapat”
                  kapalıysa fiyatı ve görseli olan ürün satışta kalır.
                </HelpTerm>
                <HelpTerm title="Satış ve katalog">
                  Bütün ürünleri kapatmak, stoğu sıfır olanları kapatmak veya hiç satılmayanları
                  silmek bu kaynağın tedarikçisine bağlı ürünlerde, senkron çalışınca uygulanır.
                  Silme, siparişi olan ürüne dokunmaz; API boş veya hatalıysa silmez.
                </HelpTerm>
              </dl>
            </HelpSection>

            <HelpSection id="calistir" title="Kaydet ve çalıştır">
              <ol className="list-decimal space-y-1.5 pl-5">
                <li>Eşlemeyi kontrol edin, Kaydet’e basın. Zamanlanmış senkron sıraya alınır.</li>
                <li>
                  Hemen denemek için <strong className="font-medium text-slate-800">Şimdi
                  çalıştır</strong> (kaynak aktif olmalı).
                </li>
                <li>
                  İlerleme çubuğu sunucu işidir. Sayfayı kapatabilirsiniz; XAMPP / Next kapanırsa
                  yeniden açılınca kaldığı yerden sürer.
                </li>
                <li>Sonuç özeti ve “Yükleme kayıtları” her çalışmanın ayrıntısını tutar.</li>
              </ol>
            </HelpSection>

            <HelpSection id="sorun" title="Sık karşılaşılanlar">
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong className="font-medium text-slate-800">HTML / doküman hatası:</strong>{" "}
                  adres ürün JSON’u değil. Liste URL’sini kullanın veya dokümandan “Get all products”
                  satırını seçin.
                </li>
                <li>
                  <strong className="font-medium text-slate-800">Hiç ürün bulunamadı:</strong> item
                  path yanlış olabilir. Örnek yanıtta ürünler{" "}
                  <code className="rounded bg-slate-100 px-1">data.items</code> altındaysa o yolu
                  yazın.
                </li>
                <li>
                  <strong className="font-medium text-slate-800">Çift ürün:</strong> eşleme anahtarı
                  boş veya değişkendir. Sabit bir id / barkod / SKU bağlayın.
                </li>
                <li>
                  <strong className="font-medium text-slate-800">Ürünler satışa kapalı geldi:</strong>{" "}
                  fiyat 0, görsel yok veya stok kapatma kuralı tetiklenmiş olabilir. Güncellenecek
                  alanları ve stok anahtarlarını kontrol edin.
                </li>
                <li>
                  <strong className="font-medium text-slate-800">Çalıştır soluk:</strong> kaynak
                  pasiftir. Önce Aktif yapın.
                </li>
                <li>
                  <strong className="font-medium text-slate-800">401 / 403:</strong> token, header
                  veya Basic bilgisi eksik ya da yanlış.
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
    <section id={`api-help-${id}`} className="scroll-mt-3">
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
