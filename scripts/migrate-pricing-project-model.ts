import { PrismaClient, PricingPriceType } from "@prisma/client";

const prisma = new PrismaClient();

const DELIVERY_NOTE = `<p><strong>Teslimat:</strong> Proje, seçtiğiniz domain ve hostinge (kendi sunucunuz dahil) kurulur; kaynak kodları size teslim edilir. Sosyal medya yönetimi, dijital pazarlama ve e-ticaret danışmanlığı isteğe bağlı devam hizmeti olarak ayrıca sunulabilir.</p><p><em>Fiyatlar tipik proje kapsamı içindir; entegrasyon ve özel modüllere göre net teklif verilir.</em></p>`;

const OPTIONAL_FEATURES = [
  { label: "Sosyal medya yönetimi (isteğe bağlı devam hizmeti)", included: false },
  { label: "Dijital pazarlama / reklam yönetimi (isteğe bağlı)", included: false },
  { label: "E-ticaret danışmanlığı (isteğe bağlı)", included: false },
];

type PlanUpdate = {
  slug: string;
  priceType: PricingPriceType;
  priceMonthly?: string;
  priceRangeMin?: string;
  priceRangeMax?: string;
  blurb: string;
  detailContent: string;
  featured?: boolean;
  ctaLabel?: string;
  features: { label: string; included: boolean }[];
};

const plans: PlanUpdate[] = [
  {
    slug: "baslangic",
    priceType: PricingPriceType.RANGE,
    priceRangeMin: "₺15.000",
    priceRangeMax: "₺25.000",
    blurb: "Kurumsal web sitesi — domain & hostinginize kurulum, kaynak kod teslimi",
    detailContent: `<p>Başlangıç paketi; dijitalde görünür olmak isteyen küçük işletmeler için tek seferlik proje bedelidir.</p>
<h3>Proje kapsamı</h3>
<ul>
<li>Mobil uyumlu tanıtım / landing sayfası</li>
<li>Temel SEO altyapısı</li>
<li>Domain &amp; hostinge kurulum</li>
<li>Kaynak kod teslimi</li>
</ul>
${DELIVERY_NOTE}`,
    features: [
      { label: "Kurumsal tanıtım / landing sayfası", included: true },
      { label: "Mobil uyumlu modern tasarım", included: true },
      { label: "Temel SEO altyapısı", included: true },
      { label: "Domain & hostinge kurulum", included: true },
      { label: "Kaynak kod teslimi", included: true },
      ...OPTIONAL_FEATURES,
    ],
  },
  {
    slug: "profesyonel",
    priceType: PricingPriceType.RANGE,
    priceRangeMin: "₺35.000",
    priceRangeMax: "₺55.000",
    blurb: "Çok sayfalı kurumsal site + admin panel — kurulum ve kaynak kod dahil",
    detailContent: `<p>Profesyonel paket; yönetilebilir kurumsal web sitesi ihtiyacı olan markalar için tek seferlik proje bedelidir.</p>
${DELIVERY_NOTE}`,
    features: [
      { label: "Çok sayfalı kurumsal web sitesi", included: true },
      { label: "Admin paneli", included: true },
      { label: "Blog / proje arşivi", included: true },
      { label: "Domain & hostinge kurulum", included: true },
      { label: "Kaynak kod teslimi", included: true },
      ...OPTIONAL_FEATURES,
    ],
  },
  {
    slug: "buyume",
    priceType: PricingPriceType.RANGE,
    priceRangeMin: "₺55.000",
    priceRangeMax: "₺85.000",
    featured: true,
    blurb: "Gelişmiş web + dönüşüm odaklı yapı — kurulum ve kaynak kod dahil",
    detailContent: `<p>Büyüme paketi; web sitesini büyüme aracına dönüştürmek isteyen markalar için tek seferlik proje bedelidir.</p>
${DELIVERY_NOTE}`,
    features: [
      { label: "Gelişmiş kurumsal web + admin paneli", included: true },
      { label: "Landing / kampanya sayfaları", included: true },
      { label: "Meta Pixel & Google Ads altyapısı", included: true },
      { label: "Domain & hostinge kurulum", included: true },
      { label: "Kaynak kod teslimi", included: true },
      ...OPTIONAL_FEATURES,
    ],
  },
  {
    slug: "kurumsal",
    priceType: PricingPriceType.QUOTE,
    ctaLabel: "Teklif Alın",
    blurb: "Özel yazılım ve entegrasyonlar — keşif sonrası net teklif",
    detailContent: `<p>Kurumsal paket; özel ihtiyaçları olan firmalar içindir. Kapsam keşif görüşmesi sonrası netleşir.</p>
${DELIVERY_NOTE}`,
    features: [
      { label: "Özel yazılım / gelişmiş web uygulaması", included: true },
      { label: "Üçüncü parti entegrasyonlar", included: true },
      { label: "Domain & hostinge kurulum", included: true },
      { label: "Kaynak kod teslimi", included: true },
      ...OPTIONAL_FEATURES,
    ],
  },
  {
    slug: "e-ticaret",
    priceType: PricingPriceType.QUOTE,
    ctaLabel: "Teklif Alın",
    blurb: "Satışa hazır online mağaza — keşif sonrası net proje teklifi",
    detailContent: `<p>E-Ticaret paketi; ürünlerini online satmak isteyen markalar içindir. Kapsam keşif sonrası netleşir.</p>
${DELIVERY_NOTE}`,
    features: [
      { label: "Mobil uyumlu e-ticaret vitrini", included: true },
      { label: "Ürün / stok / sipariş yönetimi", included: true },
      { label: "Güvenli ödeme entegrasyonu", included: true },
      { label: "Domain & hostinge kurulum", included: true },
      { label: "Kaynak kod teslimi", included: true },
      { label: "E-ticaret danışmanlığı (isteğe bağlı devam hizmeti)", included: false },
      ...OPTIONAL_FEATURES.slice(1),
    ],
  },
  {
    slug: "saas-platform",
    priceType: PricingPriceType.QUOTE,
    ctaLabel: "Teklif Alın",
    blurb: "Çok dilli, abonelikli özel yazılım — SAAS projeleri için keşif teklifi",
    detailContent: `<p>SAAS Platform paketi; kendi yazılım ürününü piyasaya sürmek isteyen firmalar içindir. Kapsam keşif sonrası netleşir.</p>
${DELIVERY_NOTE}`,
    features: [
      { label: "Çok dilli (i18n) arayüz", included: true },
      { label: "Üyelik & abonelik altyapısı", included: true },
      { label: "Müşteri + admin panelleri", included: true },
      { label: "Domain & hostinge kurulum", included: true },
      { label: "Kaynak kod teslimi", included: true },
      ...OPTIONAL_FEATURES,
    ],
  },
];

async function setProjectPricingMode() {
  for (const [key, label] of [
    ["pricing_billing_monthly_enabled", "Aylık fiyatlandırma (abonelik)"],
    ["pricing_billing_yearly_enabled", "Yıllık fiyatlandırma (abonelik)"],
  ] as const) {
    await prisma.setting.upsert({
      where: { key },
      update: { value: "false" },
      create: {
        key,
        value: "false",
        label,
        type: "boolean",
        group: "pricing_billing",
        sortOrder: key.includes("monthly") ? 0 : 1,
      },
    });
  }
}

function storedPrices(plan: PlanUpdate) {
  if (plan.priceType === PricingPriceType.FIXED) {
    const price = plan.priceMonthly ?? "—";
    return {
      priceMonthly: price,
      priceYearly: price,
      priceRangeMin: null,
      priceRangeMax: null,
    };
  }
  if (plan.priceType === PricingPriceType.RANGE) {
    const label = `${plan.priceRangeMin} – ${plan.priceRangeMax}`;
    return {
      priceMonthly: label,
      priceYearly: label,
      priceRangeMin: plan.priceRangeMin ?? null,
      priceRangeMax: plan.priceRangeMax ?? null,
    };
  }
  return {
    priceMonthly: "Teklif alın",
    priceYearly: "Teklif alın",
    priceRangeMin: null,
    priceRangeMax: null,
  };
}

async function main() {
  await setProjectPricingMode();

  for (const plan of plans) {
    const existing = await prisma.pricingPlan.findUnique({
      where: { slug: plan.slug },
    });
    if (!existing) {
      console.warn(`Skip (not found): ${plan.slug}`);
      continue;
    }

    const prices = storedPrices(plan);
    await prisma.pricingPlan.update({
      where: { slug: plan.slug },
      data: {
        priceType: plan.priceType,
        blurb: plan.blurb,
        detailContent: plan.detailContent,
        ...prices,
        priceMonthlyDiscount: null,
        priceYearlyDiscount: null,
        showPeriod: plan.priceType !== PricingPriceType.QUOTE,
        featured: plan.featured ?? existing.featured,
        features: JSON.stringify(plan.features),
        ctaLabel: plan.ctaLabel ?? existing.ctaLabel,
        ctaHref: "/iletisim",
        purchasable: false,
        stripePriceIdMonthly: null,
        stripePriceIdYearly: null,
      },
    });
    console.log(`Updated: ${plan.slug} [${plan.priceType}]`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
