import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

async function main() {
  console.log("start");
  const prisma = new PrismaClient();
  console.log("client ready");
  const count = await prisma.user.count();
  console.log("users", count);

  const email = (process.env.ADMIN_EMAIL ?? "admin@ihsanakyildiz.com").toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "Admin123!";
  const name = process.env.ADMIN_NAME ?? "Admin";
  console.log("hashing...");
  const passwordHash = await hash(password, 10);
  console.log("upsert user...");

  await prisma.user.upsert({
    where: { email },
    update: { name, password: passwordHash, role: "ADMIN" },
    create: { email, name, password: passwordHash, role: "ADMIN" },
  });

  const tr = await prisma.language.upsert({
    where: { code: "tr" },
    update: { name: "Türkçe", isDefault: true, isActive: true, sortOrder: 0 },
    create: {
      code: "tr",
      name: "Türkçe",
      isDefault: true,
      isActive: true,
      sortOrder: 0,
    },
  });

  await prisma.language.upsert({
    where: { code: "en" },
    update: { name: "English", isDefault: false, isActive: true, sortOrder: 1 },
    create: {
      code: "en",
      name: "English",
      isDefault: false,
      isActive: true,
      sortOrder: 1,
    },
  });

  const adminLoginKeys = [
    { key: "title", value: "Giriş Yap" },
    { key: "subtitle", value: "Devam etmek için yönetici hesabınızla oturum açın." },
    { key: "email", value: "E-posta" },
    { key: "password", value: "Şifre" },
    { key: "remember", value: "Beni hatırla" },
    { key: "submit", value: "Giriş Yap" },
    { key: "submitting", value: "Giriş yapılıyor..." },
    { key: "errorRequired", value: "E-posta ve şifre zorunludur." },
    { key: "errorInvalid", value: "E-posta veya şifre hatalı." },
  ];

  for (const item of adminLoginKeys) {
    await prisma.translation.upsert({
      where: {
        languageId_namespace_key: {
          languageId: tr.id,
          namespace: "admin.login",
          key: item.key,
        },
      },
      update: { value: item.value },
      create: {
        languageId: tr.id,
        namespace: "admin.login",
        key: item.key,
        value: item.value,
      },
    });
  }

  const defaultSettings = [
    {
      group: "general",
      key: "site_name",
      value: "İhsan Akyıldız",
      label: "Site Adı",
      type: "text",
      sortOrder: 0,
    },
    {
      group: "general",
      key: "site_description",
      value:
        "Web tasarım, yazılım geliştirme ve dijital çözümler sunan profesyonel stüdyo.",
      label: "Site Açıklaması",
      type: "textarea",
      sortOrder: 2,
    },
    {
      group: "general",
      key: "site_url",
      value: "https://ihsanakyildiz.com",
      label: "Site URL",
      type: "url",
      sortOrder: 3,
    },
    {
      group: "contact",
      key: "contact_email",
      value: "info@ihsanakyildiz.com",
      label: "İletişim E-posta",
      type: "email",
      sortOrder: 0,
    },
  ];

  for (const setting of defaultSettings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: {
        label: setting.label,
        type: setting.type,
        group: setting.group,
        sortOrder: setting.sortOrder,
      },
      create: setting,
    });
  }

  const workCategories = [
    {
      name: "Web Tasarım",
      slug: "web-tasarim",
      description: "Kurumsal ve modern web sitesi arayüz tasarımı.",
      content:
        "Markanıza uygun, mobil uyumlu ve dönüşüm odaklı web arayüzleri tasarlıyoruz.",
      icon: "palette",
      sortOrder: 0,
    },
    {
      name: "Web Programlama",
      slug: "web-programlama",
      description: "Özel yazılım ve web uygulama geliştirme.",
      content:
        "Next.js, PHP ve modern teknolojilerle güvenli, ölçeklenebilir web yazılımları geliştiriyoruz.",
      icon: "code",
      sortOrder: 1,
    },
    {
      name: "E-Ticaret",
      slug: "e-ticaret",
      description: "Online mağaza kurulumu ve entegrasyonları.",
      content:
        "Ödeme sistemleri, ürün yönetimi ve satış süreçlerine hazır e-ticaret çözümleri sunuyoruz.",
      icon: "shopping-cart",
      sortOrder: 2,
    },
    {
      name: "Kurumsal Kimlik",
      slug: "kurumsal-kimlik",
      description: "Logo, marka dili ve görsel kimlik çalışmaları.",
      content:
        "Markanızın görünür yüzünü tutarlı ve profesyonel bir kimlikle güçlendiriyoruz.",
      icon: "fingerprint",
      sortOrder: 3,
    },
  ];

  for (const category of workCategories) {
    await prisma.workCategory.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        description: category.description,
        content: category.content,
        icon: category.icon,
        sortOrder: category.sortOrder,
        isActive: true,
      },
      create: {
        ...category,
        isActive: true,
      },
    });
  }

  const projectCategories = [
    {
      name: "Kurumsal Web",
      slug: "kurumsal-web",
      description: "Kurumsal web sitesi ve portal projeleri.",
      content: "Marka ve dönüşüm odaklı kurumsal web projeleri.",
      icon: "globe",
      sortOrder: 0,
    },
    {
      name: "Mobil Uygulama",
      slug: "mobil-uygulama",
      description: "iOS ve Android mobil uygulama projeleri.",
      content: "Kullanıcı deneyimi odaklı native ve hibrit mobil uygulamalar.",
      icon: "smartphone",
      sortOrder: 1,
    },
    {
      name: "E-Ticaret",
      slug: "proje-e-ticaret",
      description: "Online mağaza ve pazaryeri projeleri.",
      content: "Satış, stok ve ödeme süreçlerini kapsayan e-ticaret projeleri.",
      icon: "shopping-bag",
      sortOrder: 2,
    },
  ];

  for (const category of projectCategories) {
    await prisma.projectCategory.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        description: category.description,
        content: category.content,
        icon: category.icon,
        sortOrder: category.sortOrder,
        isActive: true,
      },
      create: {
        ...category,
        isActive: true,
      },
    });
  }

  const projectFeatures = [
    { name: "PHP", slug: "php", description: "Sunucu tarafı PHP geliştirme", icon: "code", sortOrder: 0 },
    { name: "MySQL", slug: "mysql", description: "MySQL veritabanı", icon: "database", sortOrder: 1 },
    { name: "React", slug: "react", description: "React arayüz geliştirme", icon: "atom", sortOrder: 2 },
    { name: "WordPress", slug: "wordpress", description: "WordPress CMS", icon: "globe", sortOrder: 3 },
    { name: "Next.js", slug: "nextjs", description: "Next.js uygulamaları", icon: "layers", sortOrder: 4 },
    { name: "TypeScript", slug: "typescript", description: "TypeScript", icon: "file-code", sortOrder: 5 },
  ];

  for (const feature of projectFeatures) {
    await prisma.projectFeature.upsert({
      where: { slug: feature.slug },
      update: {
        name: feature.name,
        description: feature.description,
        icon: feature.icon,
        sortOrder: feature.sortOrder,
        isActive: true,
      },
      create: {
        ...feature,
        isActive: true,
      },
    });
  }

  const projectClients = [
    {
      name: "Acme Holding",
      slug: "acme-holding",
      sector: "Kurumsal",
      website: "https://example.com",
      description: "Örnek kurumsal müşteri",
      sortOrder: 0,
    },
    {
      name: "Nova Market",
      slug: "nova-market",
      sector: "E-ticaret",
      website: "https://example.com",
      description: "Örnek e-ticaret müşterisi",
      sortOrder: 1,
    },
  ];

  for (const client of projectClients) {
    await prisma.projectClient.upsert({
      where: { slug: client.slug },
      update: {
        name: client.name,
        sector: client.sector,
        website: client.website,
        description: client.description,
        sortOrder: client.sortOrder,
        isActive: true,
      },
      create: {
        ...client,
        isActive: true,
      },
    });
  }

  const blogCategories = [
    {
      name: "Web Tasarım",
      slug: "blog-web-tasarim",
      description: "Tasarım trendleri ve UI/UX yazıları.",
      content: "Web tasarım ve kullanıcı deneyimi üzerine içerikler.",
      icon: "palette",
      sortOrder: 0,
    },
    {
      name: "Yazılım",
      slug: "blog-yazilim",
      description: "Geliştirme, mimari ve araçlar.",
      content: "Yazılım geliştirme pratikleri ve teknoloji yazıları.",
      icon: "code",
      sortOrder: 1,
    },
    {
      name: "Dijital Pazarlama",
      slug: "blog-dijital-pazarlama",
      description: "SEO, içerik ve büyüme.",
      content: "Dijital pazarlama stratejileri ve vaka çalışmaları.",
      icon: "megaphone",
      sortOrder: 2,
    },
  ];

  for (const category of blogCategories) {
    await prisma.blogCategory.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        description: category.description,
        content: category.content,
        icon: category.icon,
        sortOrder: category.sortOrder,
        isActive: true,
      },
      create: {
        ...category,
        isActive: true,
      },
    });
  }

  await prisma.hero.upsert({
    where: { slug: "anasayfa-hero" },
    update: {
      name: "Anasayfa Hero",
      description: "Ana sayfa üst bölüm slayt alanı",
      isActive: true,
      sortOrder: 0,
      autoplay: true,
      intervalMs: 6000,
      showDots: true,
      showArrows: true,
    },
    create: {
      name: "Anasayfa Hero",
      slug: "anasayfa-hero",
      description: "Ana sayfa üst bölüm slayt alanı",
      isActive: true,
      sortOrder: 0,
      autoplay: true,
      intervalMs: 6000,
      showDots: true,
      showArrows: true,
    },
  });

  const sampleCards = [
    {
      title: "Web Tasarım",
      icon: "Palette",
      href: "/hizmetler/web-tasarim",
      sortOrder: 0,
    },
    {
      title: "Yazılım",
      icon: "Code",
      href: "/hizmetler/yazilim",
      sortOrder: 1,
    },
    {
      title: "Dijital Pazarlama",
      icon: "Megaphone",
      href: "/hizmetler/dijital-pazarlama",
      sortOrder: 2,
    },
  ];

  for (const card of sampleCards) {
    const existing = await prisma.card.findFirst({
      where: { title: card.title, href: card.href },
      select: { id: true },
    });
    if (existing) {
      await prisma.card.update({
        where: { id: existing.id },
        data: {
          icon: card.icon,
          mediaType: "ICON",
          sortOrder: card.sortOrder,
          isActive: true,
        },
      });
    } else {
      await prisma.card.create({
        data: {
          title: card.title,
          icon: card.icon,
          href: card.href,
          mediaType: "ICON",
          sortOrder: card.sortOrder,
          isActive: true,
        },
      });
    }
  }

  const sampleFaqGroups = [
    {
      name: "Anasayfa SSS",
      slug: "anasayfa-sss",
      description: "Ana sayfada gösterilecek sorular",
      sortOrder: 0,
      items: [
        {
          question: "Proje süreci nasıl işliyor?",
          answer:
            "<p>Önce ihtiyaç analizi yapıyoruz, ardından tasarım ve geliştirme aşamalarına geçiyoruz. Teslim sonrası destek sağlıyoruz.</p>",
          sortOrder: 0,
        },
        {
          question: "Teklif almak ücretsiz mi?",
          answer:
            "<p>Evet. Proje kapsamını netleştirdikten sonra ücretsiz teklif hazırlıyoruz.</p>",
          sortOrder: 1,
        },
      ],
    },
    {
      name: "Hizmetler SSS",
      slug: "hizmetler-sss",
      description: "Hizmet sayfalarında kullanılacak sorular",
      sortOrder: 1,
      items: [
        {
          question: "Teslim sonrası destek var mı?",
          answer:
            "<p>Evet. Anlaşmaya bağlı olarak bakım, güncelleme ve teknik destek hizmeti sunuyoruz.</p>",
          sortOrder: 0,
        },
      ],
    },
  ];

  for (const group of sampleFaqGroups) {
    const saved = await prisma.faqGroup.upsert({
      where: { slug: group.slug },
      update: {
        name: group.name,
        description: group.description,
        sortOrder: group.sortOrder,
        isActive: true,
      },
      create: {
        name: group.name,
        slug: group.slug,
        description: group.description,
        sortOrder: group.sortOrder,
        isActive: true,
      },
    });

    for (const item of group.items) {
      const existingItem = await prisma.faqItem.findFirst({
        where: { groupId: saved.id, question: item.question },
        select: { id: true },
      });
      if (existingItem) {
        await prisma.faqItem.update({
          where: { id: existingItem.id },
          data: {
            answer: item.answer,
            sortOrder: item.sortOrder,
            isActive: true,
          },
        });
      } else {
        await prisma.faqItem.create({
          data: {
            groupId: saved.id,
            question: item.question,
            answer: item.answer,
            sortOrder: item.sortOrder,
            isActive: true,
          },
        });
      }
    }
  }

  const sampleMenuGroups = [
    {
      name: "Header Menü",
      slug: "header-menu",
      description: "Üst navigasyon menüsü",
      sortOrder: 0,
      items: [
        {
          label: "Ana Sayfa",
          linkType: "CUSTOM" as const,
          href: "/",
          sortOrder: 0,
        },
        {
          label: "Hizmetler",
          linkType: "CUSTOM" as const,
          href: "/hizmetler",
          sortOrder: 1,
          children: [
            {
              label: "Web Tasarım",
              linkType: "CUSTOM" as const,
              href: "/hizmetler/web-tasarim",
              sortOrder: 0,
            },
            {
              label: "Web Programlama",
              linkType: "CUSTOM" as const,
              href: "/hizmetler/web-programlama",
              sortOrder: 1,
            },
          ],
        },
        {
          label: "İletişim",
          linkType: "CUSTOM" as const,
          href: "/iletisim",
          sortOrder: 2,
        },
      ],
    },
    {
      name: "Footer Menü",
      slug: "footer-menu",
      description: "Alt bilgi menüsü",
      sortOrder: 1,
      items: [
        {
          label: "Hakkımızda",
          linkType: "CUSTOM" as const,
          href: "/hakkimizda",
          sortOrder: 0,
        },
        {
          label: "Blog",
          linkType: "CUSTOM" as const,
          href: "/blog",
          sortOrder: 1,
        },
        {
          label: "Gizlilik",
          linkType: "CUSTOM" as const,
          href: "/gizlilik",
          sortOrder: 2,
        },
      ],
    },
  ];

  for (const group of sampleMenuGroups) {
    const saved = await prisma.menuGroup.upsert({
      where: { slug: group.slug },
      update: {
        name: group.name,
        description: group.description,
        sortOrder: group.sortOrder,
        isActive: true,
      },
      create: {
        name: group.name,
        slug: group.slug,
        description: group.description,
        sortOrder: group.sortOrder,
        isActive: true,
      },
    });

    async function upsertItem(
      item: {
        label: string;
        linkType: "CUSTOM";
        href: string;
        sortOrder: number;
        children?: Array<{
          label: string;
          linkType: "CUSTOM";
          href: string;
          sortOrder: number;
        }>;
      },
      parentId: string | null,
    ) {
      const existing = await prisma.menuItem.findFirst({
        where: { groupId: saved.id, label: item.label, parentId },
        select: { id: true },
      });

      const data = {
        groupId: saved.id,
        parentId,
        label: item.label,
        linkType: item.linkType,
        href: item.href,
        sortOrder: item.sortOrder,
        isActive: true,
      };

      const row = existing
        ? await prisma.menuItem.update({ where: { id: existing.id }, data })
        : await prisma.menuItem.create({ data });

      for (const child of item.children ?? []) {
        await upsertItem(child, row.id);
      }
    }

    for (const item of group.items) {
      await upsertItem(item, null);
    }
  }

  const pricingCount = await prisma.pricingPlan.count();
  if (pricingCount === 0) {
    const defaultPlans = [
      {
        name: "Deneme",
        slug: "deneme",
        blurb: "Test ve keşif için",
        priceMonthly: "Ücretsiz",
        priceYearly: "Ücretsiz",
        showPeriod: false,
        featured: false,
        features: JSON.stringify([
          { label: "Tek ekip üyesi", included: true },
          { label: "Temel UI blokları", included: true },
          { label: "10 GB depolama", included: true },
          { label: "Özel e-posta hesabı", included: false },
          { label: "Öncelikli destek", included: false },
        ]),
        ctaLabel: "Başlayın",
        ctaHref: "/iletisim",
        sortOrder: 0,
      },
      {
        name: "Standart",
        slug: "standart",
        blurb: "Büyüyen ekipler için",
        priceMonthly: "₺14.900",
        priceYearly: "₺149.000",
        showPeriod: true,
        featured: true,
        features: JSON.stringify([
          { label: "5 ekip üyesi", included: true },
          { label: "Tüm medya kanalları", included: true },
          { label: "Gelişmiş CRM özellikleri", included: true },
          { label: "15.000 kişiye kadar", included: true },
          { label: "7/24 destek", included: true },
        ]),
        ctaLabel: "Başlayın",
        ctaHref: "/iletisim",
        sortOrder: 1,
      },
      {
        name: "Kurumsal",
        slug: "kurumsal",
        blurb: "İleri seviye projeler",
        priceMonthly: "₺24.900",
        priceYearly: "₺249.000",
        showPeriod: true,
        featured: false,
        features: JSON.stringify([
          { label: "50 ekip üyesi", included: true },
          { label: "Geniş UI kütüphanesi", included: true },
          { label: "100 GB depolama", included: true },
          { label: "Özel e-posta hesabı", included: true },
          { label: "Öncelikli destek", included: true },
        ]),
        ctaLabel: "Başlayın",
        ctaHref: "/iletisim",
        sortOrder: 2,
      },
    ];

    await prisma.pricingPlan.createMany({ data: defaultPlans });
    console.log("Default pricing plans seeded.");
  }

  console.log("Seed tamamlandı.");
  console.log(`Admin: ${email}`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  process.exit(1);
});
