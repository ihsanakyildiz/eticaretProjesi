import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const plans = [
  {
    name: "E-Ticaret",
    slug: "e-ticaret",
    blurb:
      "Vitrin, ödeme, stok ve sipariş yönetimiyle satışa hazır online mağaza",
    detailContent: `<p>E-Ticaret paketi; ürünlerinizi güvenle satabileceğiniz modern bir online mağaza kurar. Katalog, sepet, ödeme ve sipariş akışı tek panelden yönetilir.</p>
<h3>Pakete neler dahil?</h3>
<ul>
<li>Mobil uyumlu vitrin ve kategori yapısı</li>
<li>Ürün, varyant, stok ve fiyat yönetimi</li>
<li>Sepet, kupon ve güvenli ödeme altyapısı (iyzico / Stripe)</li>
<li>Sipariş paneli ve kargo entegrasyonuna hazır yapı</li>
<li>Temel SEO, hız ve dönüşüm odaklı ürün sayfaları</li>
<li>Admin panelinden ürün / içerik düzenleme</li>
</ul>
<h3>Bu paket kimler için?</h3>
<ul>
<li>Yeni e-ticaret sitesi açmak isteyen markalar</li>
<li>Mevcut kataloğunu online’a taşımak isteyen işletmeler</li>
<li>Ödeme ve sipariş sürecini tek yerden yönetmek isteyen ekipler</li>
</ul>
<p>Pazar yeri entegrasyonları, özel ERP bağlantıları veya çok mağazalı yapılar kapsam dışı bırakılabilir; ihtiyaç halinde <strong>SAAS Platform</strong> paketine geçilir.</p>`,
    priceMonthly: "₺34.900",
    priceYearly: "₺349.000",
    showPeriod: true,
    featured: false,
    features: JSON.stringify([
      { label: "Mobil uyumlu e-ticaret vitrini", included: true },
      { label: "Ürün / varyant / stok yönetimi", included: true },
      { label: "Sepet, kupon ve güvenli ödeme", included: true },
      { label: "Sipariş paneli & kargo hazırlığı", included: true },
      { label: "SEO & hızlı ürün sayfaları", included: true },
      { label: "Admin panelinden katalog yönetimi", included: true },
      { label: "Meta / Google Shopping hazırlığı", included: true },
      { label: "Çok para birimi & vergi kuralları", included: false },
      { label: "Pazar yeri / ERP entegrasyonu", included: false },
      { label: "Öncelikli destek (24 saat)", included: false },
    ]),
    ctaLabel: "Başlayın",
    ctaHref: "/iletisim",
    sortOrder: 4,
  },
  {
    name: "SAAS Platform",
    slug: "saas-platform",
    blurb:
      "Çok dilli, abonelikli ve ölçeklenebilir özel yazılım — kurumsal SAAS projeleri için",
    detailContent: `<p>SAAS Platform paketi; bir firmanın kendi ürününü yazılım olarak sunması için tasarlandı. Çok dilli arayüz, üyelik, yetkilendirme, abonelik ödemeleri ve admin panelleri uçtan uca planlanır.</p>
<h3>Pakete neler dahil?</h3>
<ul>
<li>Çok dilli (i18n) kullanıcı ve yönetim arayüzleri</li>
<li>Rol tabanlı üyelik, yetki ve ekip yönetimi</li>
<li>Abonelik / faturalama (Stripe veya benzeri)</li>
<li>Müşteri paneli + güçlü admin paneli</li>
<li>API, webhook ve üçüncü parti entegrasyonlara hazır mimari</li>
<li>Ölçeklenebilir Next.js + veritabanı mimarisi</li>
<li>Staging, CI/CD ve teknik dokümantasyon</li>
<li>Öncelikli stüdyo desteği ve yol haritası danışmanlığı</li>
</ul>
<h3>Bu paket kimler için?</h3>
<ul>
<li>Kendi SAAS ürününü çıkarmak isteyen girişimler</li>
<li>Çok dilli / çok kiracılı (multi-tenant) platform ihtiyacı olan firmalar</li>
<li>Abonelik modeli ile yazılım satacak ekipler</li>
</ul>
<p>Her SAAS projesi kapsamı farklıdır. Listelenen tutar tipik bir başlangıç bandıdır; keşif görüşmesi sonrası net teklif hazırlanır.</p>`,
    priceMonthly: "₺89.900",
    priceYearly: "₺899.000",
    showPeriod: true,
    featured: false,
    features: JSON.stringify([
      { label: "Çok dilli (i18n) arayüz", included: true },
      { label: "Rol tabanlı üyelik & yetkilendirme", included: true },
      { label: "Abonelik / Stripe billing", included: true },
      { label: "Müşteri + admin panelleri", included: true },
      { label: "API & entegrasyon mimarisi", included: true },
      { label: "Ölçeklenebilir Next.js altyapısı", included: true },
      { label: "Staging, CI/CD & dokümantasyon", included: true },
      { label: "Multi-tenant / çok kiracılı yapı", included: true },
      { label: "Özel raporlama & analitik", included: true },
      { label: "Öncelikli stüdyo desteği", included: true },
    ]),
    ctaLabel: "Teklif Alın",
    ctaHref: "/iletisim",
    sortOrder: 5,
  },
] as const;

async function main() {
  for (const plan of plans) {
    const existing = await prisma.pricingPlan.findUnique({
      where: { slug: plan.slug },
    });

    if (existing) {
      await prisma.pricingPlan.update({
        where: { slug: plan.slug },
        data: {
          name: plan.name,
          blurb: plan.blurb,
          detailContent: plan.detailContent,
          priceMonthly: plan.priceMonthly,
          priceYearly: plan.priceYearly,
          showPeriod: plan.showPeriod,
          featured: plan.featured,
          features: plan.features,
          ctaLabel: plan.ctaLabel,
          ctaHref: plan.ctaHref,
          sortOrder: plan.sortOrder,
          isActive: true,
        },
      });
      console.log(`Updated: ${plan.slug}`);
    } else {
      await prisma.pricingPlan.create({
        data: {
          name: plan.name,
          slug: plan.slug,
          blurb: plan.blurb,
          detailContent: plan.detailContent,
          priceMonthly: plan.priceMonthly,
          priceYearly: plan.priceYearly,
          showPeriod: plan.showPeriod,
          featured: plan.featured,
          features: plan.features,
          ctaLabel: plan.ctaLabel,
          ctaHref: plan.ctaHref,
          sortOrder: plan.sortOrder,
          isActive: true,
        },
      });
      console.log(`Created: ${plan.slug}`);
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
