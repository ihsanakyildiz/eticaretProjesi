import { membershipSettingGroups } from "@/config/membership-settings";
import { pricingSettingGroups } from "@/config/pricing-settings";
import { themeSettingGroups } from "@/config/theme-settings";

export type SettingFieldType =
  | "text"
  | "textarea"
  | "url"
  | "email"
  | "tel"
  | "password"
  | "number"
  | "boolean"
  | "image"
  | "file";

export type SettingFieldDef = {
  key: string;
  label: string;
  type: SettingFieldType;
  placeholder?: string;
  hint?: string;
  defaultValue?: string;
  /** textarea satır sayısı */
  rows?: number;
  /** monospace / kod alanı görünümü */
  codeEditor?: boolean;
  /** Formda düzenlenemez; sunucu değeri yazılır */
  readOnly?: boolean;
  /** password: boş kayıtta mevcut değer korunur */
  preserveIfEmpty?: boolean;
  accept?: string;
  recommendedSize?: string;
  uploadDir?: string;
  fixedFileName?: string;
  /** webp: performans; favicon: PNG+WebP; preserve: ham kayıt */
  imageMode?: "webp" | "favicon" | "preserve";
  width?: number;
  height?: number;
  quality?: number;
  min?: number;
  max?: number;
};

export type SettingGroupDef = {
  id: string;
  title: string;
  description: string;
  fields: SettingFieldDef[];
};

export const settingGroups: SettingGroupDef[] = [
  {
    id: "general",
    title: "Genel Bilgiler",
    description: "Sitenin temel kimlik ve erişim bilgileri",
    fields: [
      {
        key: "site_name",
        label: "Site Adı",
        type: "text",
        placeholder: "İhsan Akyıldız",
        defaultValue: "İhsan Akyıldız",
      },
      {
        key: "site_tagline",
        label: "Slogan / Kısa Başlık",
        type: "text",
        placeholder: "Web tasarım & yazılım stüdyosu",
        defaultValue: "Web tasarım & yazılım stüdyosu",
      },
      {
        key: "site_description",
        label: "Site Açıklaması",
        type: "textarea",
        placeholder: "Kısa site açıklaması",
        defaultValue:
          "Web tasarım, yazılım geliştirme ve dijital çözümler sunan profesyonel stüdyo.",
      },
      {
        key: "site_url",
        label: "Site URL",
        type: "url",
        placeholder: "https://ihsanakyildiz.com",
        defaultValue: "https://ihsanakyildiz.com",
      },
      {
        key: "site_path",
        label: "Site Dizin Yolu",
        type: "text",
        readOnly: true,
        placeholder: "Otomatik algılanır",
        hint: "Sunucuda çalışan uygulamanın kök dizini otomatik algılanır ve kaydedilir. Elle değiştirilemez.",
        defaultValue: "",
      },
      {
        key: "site_image_path",
        label: "Site Görsel Yolu",
        type: "text",
        placeholder: "/uploads veya /public/uploads",
        hint: "Yüklenen görsellerin saklandığı göreli yol",
        defaultValue: "/uploads",
      },
      {
        key: "site_copyright",
        label: "Telif / Footer Metni",
        type: "text",
        placeholder: "© 2026 İhsan Akyıldız. Tüm hakları saklıdır.",
        defaultValue: "© İhsan Akyıldız. Tüm hakları saklıdır.",
      },
      {
        key: "maintenance_mode",
        label: "Bakım Modu",
        type: "boolean",
        hint: "Aktifken ziyaretçilere bakım sayfası gösterilir",
        defaultValue: "false",
      },
    ],
  },
  {
    id: "branding",
    title: "Logo & Favicon",
    description:
      "Logo WebP olarak optimize edilir. Favicon’lar tarayıcı uyumu için PNG + performans için WebP üretir. Değiştirme/kaldırmada eski dosyalar sunucudan silinir.",
    fields: [
      {
        key: "site_logo",
        label: "Site Logosu",
        type: "image",
        hint: "Yükleme sonrası otomatik WebP’ye çevrilir. SVG dosyaları vektör olarak korunur.",
        accept: "image/png,image/jpeg,image/webp,image/svg+xml",
        recommendedSize: "Örn. 200×60 — max 2000px, WebP kalite ~82",
        uploadDir: "uploads/branding",
        imageMode: "webp",
        quality: 82,
        defaultValue: "",
      },
      {
        key: "favicon_apple_touch",
        label: "Apple Touch Icon (180×180)",
        type: "image",
        hint: '<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png"> + WebP eşleniği',
        accept: "image/png,image/jpeg,image/webp",
        recommendedSize: "180×180 — PNG (Apple) + WebP",
        fixedFileName: "apple-touch-icon.png",
        imageMode: "favicon",
        width: 180,
        height: 180,
        quality: 90,
        defaultValue: "/apple-touch-icon.png",
      },
      {
        key: "favicon_32",
        label: "Favicon 32×32",
        type: "image",
        hint: '<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png"> + WebP eşleniği',
        accept: "image/png,image/jpeg,image/webp",
        recommendedSize: "32×32 — PNG + WebP",
        fixedFileName: "favicon-32x32.png",
        imageMode: "favicon",
        width: 32,
        height: 32,
        quality: 90,
        defaultValue: "/favicon-32x32.png",
      },
      {
        key: "favicon_16",
        label: "Favicon 16×16",
        type: "image",
        hint: '<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png"> + WebP eşleniği',
        accept: "image/png,image/jpeg,image/webp",
        recommendedSize: "16×16 — PNG + WebP",
        fixedFileName: "favicon-16x16.png",
        imageMode: "favicon",
        width: 16,
        height: 16,
        quality: 90,
        defaultValue: "/favicon-16x16.png",
      },
      {
        key: "site_webmanifest",
        label: "Web App Manifest",
        type: "file",
        hint: '<link rel="manifest" href="/site.webmanifest"> — Boş bırakırsanız ikonlardan (PNG+WebP) otomatik üretilir.',
        accept: "application/manifest+json,.webmanifest,application/json",
        fixedFileName: "site.webmanifest",
        defaultValue: "/site.webmanifest",
      },
    ],
  },
  {
    id: "contact",
    title: "İletişim",
    description: "İletişim sayfası ve footer bilgileri",
    fields: [
      {
        key: "contact_email",
        label: "İletişim E-posta",
        type: "email",
        placeholder: "info@ihsanakyildiz.com",
        defaultValue: "info@ihsanakyildiz.com",
      },
      {
        key: "contact_phone",
        label: "Telefon",
        type: "tel",
        placeholder: "+90 5xx xxx xx xx",
        defaultValue: "",
      },
      {
        key: "contact_whatsapp",
        label: "WhatsApp",
        type: "tel",
        placeholder: "+90 5xx xxx xx xx",
        defaultValue: "",
      },
      {
        key: "contact_address",
        label: "Adres",
        type: "textarea",
        placeholder: "Mahalle, sokak, ilçe / il",
        defaultValue: "",
      },
      {
        key: "contact_working_hours",
        label: "Çalışma Saatleri",
        type: "text",
        placeholder: "Pzt–Cum 09:00–18:00",
        defaultValue: "Pzt–Cum 09:00–18:00",
      },
      {
        key: "contact_map_embed",
        label: "Harita Embed URL / iframe",
        type: "textarea",
        placeholder: "Google Maps embed kodu veya URL",
        defaultValue: "",
      },
    ],
  },
  {
    id: "seo",
    title: "SEO & Meta",
    description: "Arama motoru ve paylaşım meta ayarları",
    fields: [
      {
        key: "seo_title",
        label: "Varsayılan SEO Başlığı",
        type: "text",
        placeholder: "İhsan Akyıldız | Web Tasarım & Yazılım",
        defaultValue: "İhsan Akyıldız | Web Tasarım & Yazılım",
      },
      {
        key: "seo_description",
        label: "Varsayılan Meta Açıklama",
        type: "textarea",
        placeholder: "Arama sonuçlarında görünecek kısa açıklama",
        defaultValue:
          "Web tasarım, yazılım geliştirme ve dijital çözümler. Projelerimizi ve blog yazılarımızı inceleyin.",
      },
      {
        key: "seo_keywords",
        label: "Anahtar Kelimeler",
        type: "text",
        placeholder: "web tasarım, yazılım, next.js",
        hint: "Virgülle ayırın",
        defaultValue: "web tasarım, yazılım, kurumsal site, next.js",
      },
      {
        key: "seo_og_image",
        label: "Open Graph Görseli",
        type: "image",
        hint: "Sosyal paylaşımlar için otomatik WebP’ye çevrilir (1200×630 kırpma).",
        accept: "image/png,image/jpeg,image/webp",
        recommendedSize: "1200×630 — WebP kalite ~85",
        uploadDir: "uploads/og",
        imageMode: "webp",
        width: 1200,
        height: 630,
        quality: 85,
        defaultValue: "",
      },
      {
        key: "seo_robots",
        label: "Robots Meta",
        type: "text",
        placeholder: "index, follow",
        defaultValue: "index, follow",
      },
      {
        key: "google_site_verification",
        label: "Google Search Console doğrulama",
        type: "text",
        placeholder: "content değerindeki kod",
        hint: "Search Console HTML etiketindeki content kodu. Sitemap: /sitemap.xml",
        defaultValue: "",
      },
      {
        key: "google_analytics_id",
        label: "Google Analytics ID",
        type: "text",
        placeholder: "G-XXXXXXXXXX",
        defaultValue: "",
      },
      {
        key: "google_tag_manager_id",
        label: "Google Tag Manager ID",
        type: "text",
        placeholder: "GTM-XXXXXXX",
        defaultValue: "",
      },
    ],
  },
  {
    id: "custom_code",
    title: "Özel Kod Enjeksiyonu",
    description:
      "Doğrulama meta etiketleri, pixel veya üçüncü parti script’leri kaynak koda ekleyin. Yalnızca güvendiğiniz kodları yapıştırın.",
    fields: [
      {
        key: "custom_code_head",
        label: "</head> öncesi kod",
        type: "textarea",
        rows: 8,
        codeEditor: true,
        placeholder:
          '<!-- Örn. Google / Bing doğrulama -->\n<meta name="google-site-verification" content="..." />\n<script>...</script>',
        hint: "Bu alanın içeriği public sitede </head> etiketinden hemen önce eklenir. Admin panelinde çalışmaz.",
        defaultValue: "",
      },
      {
        key: "custom_code_body",
        label: "</body> öncesi kod",
        type: "textarea",
        rows: 8,
        codeEditor: true,
        placeholder:
          "<!-- Örn. chat widget, pixel -->\n<script>...</script>",
        hint: "Bu alanın içeriği public sitede </body> etiketinden hemen önce eklenir. Admin panelinde çalışmaz.",
        defaultValue: "",
      },
    ],
  },
  {
    id: "social",
    title: "Sosyal Medya",
    description: "Sosyal hesap bağlantıları",
    fields: [
      {
        key: "social_facebook",
        label: "Facebook",
        type: "url",
        placeholder: "https://facebook.com/...",
        defaultValue: "",
      },
      {
        key: "social_instagram",
        label: "Instagram",
        type: "url",
        placeholder: "https://instagram.com/...",
        defaultValue: "",
      },
      {
        key: "social_twitter",
        label: "X (Twitter)",
        type: "url",
        placeholder: "https://x.com/...",
        defaultValue: "",
      },
      {
        key: "social_linkedin",
        label: "LinkedIn",
        type: "url",
        placeholder: "https://linkedin.com/in/...",
        defaultValue: "",
      },
      {
        key: "social_youtube",
        label: "YouTube",
        type: "url",
        placeholder: "https://youtube.com/@...",
        defaultValue: "",
      },
      {
        key: "social_github",
        label: "GitHub",
        type: "url",
        placeholder: "https://github.com/...",
        defaultValue: "",
      },
    ],
  },
  {
    id: "mail",
    title: "E-posta / Posta Kutusu",
    description:
      "Gönderim (SMTP), admin paneli gelen kutusu ve isteğe bağlı IMAP çekimi. Hazır servis şablonları host/port’u otomatik doldurur.",
    fields: [
      {
        key: "smtp_enabled",
        label: "SMTP ile gönderimi aç",
        type: "boolean",
        hint: "Kapalıyken iletişim formu e-posta göndermez.",
        defaultValue: "false",
      },
      {
        key: "smtp_provider",
        label: "E-posta servisi",
        type: "text",
        placeholder: "custom",
        defaultValue: "custom",
      },
      {
        key: "smtp_host",
        label: "SMTP Host",
        type: "text",
        placeholder: "mail.ornek.com veya smtp.gmail.com",
        defaultValue: "",
      },
      {
        key: "smtp_port",
        label: "SMTP Port",
        type: "number",
        placeholder: "587",
        defaultValue: "587",
        min: 1,
        max: 65535,
      },
      {
        key: "smtp_secure",
        label: "SSL / TLS (port 465)",
        type: "boolean",
        defaultValue: "false",
      },
      {
        key: "smtp_user",
        label: "SMTP Kullanıcı Adı",
        type: "text",
        placeholder: "info@alanadiniz.com",
        defaultValue: "",
      },
      {
        key: "smtp_password",
        label: "SMTP Şifresi",
        type: "password",
        placeholder: "••••••••",
        defaultValue: "",
        preserveIfEmpty: true,
      },
      {
        key: "mail_from_name",
        label: "Gönderen Adı",
        type: "text",
        placeholder: "İhsan Akyıldız",
        defaultValue: "İhsan Akyıldız",
      },
      {
        key: "mail_from_email",
        label: "Gönderen E-posta",
        type: "email",
        placeholder: "noreply@ihsanakyildiz.com",
        defaultValue: "noreply@ihsanakyildiz.com",
      },
      {
        key: "mail_notify_email",
        label: "Bildirim E-postası",
        type: "email",
        placeholder: "admin@ihsanakyildiz.com",
        defaultValue: "admin@ihsanakyildiz.com",
      },
      {
        key: "mail_reply_to",
        label: "Reply-To (isteğe bağlı)",
        type: "email",
        placeholder: "info@ihsanakyildiz.com",
        defaultValue: "",
      },
      {
        key: "mail_store_contact_messages",
        label: "İletişim formu mesajlarını panele kaydet",
        type: "boolean",
        hint: "Önerilir: form gönderimleri admin gelen kutusuna düşer ve cevaplanabilir.",
        defaultValue: "true",
      },
      {
        key: "mail_contact_subject_prefix",
        label: "İletişim formu konu öneki",
        type: "text",
        placeholder: "[İletişim Formu]",
        defaultValue: "[İletişim Formu]",
      },
      {
        key: "imap_enabled",
        label: "IMAP ile posta kutusundan çek",
        type: "boolean",
        hint: "Açıkken filtrelenmiş mailler admin paneline senkronlanır.",
        defaultValue: "false",
      },
      {
        key: "imap_same_as_smtp",
        label: "IMAP için SMTP kullanıcı/şifresini kullan",
        type: "boolean",
        defaultValue: "true",
      },
      {
        key: "imap_host",
        label: "IMAP Host",
        type: "text",
        placeholder: "imap.gmail.com",
        defaultValue: "",
      },
      {
        key: "imap_port",
        label: "IMAP Port",
        type: "number",
        placeholder: "993",
        defaultValue: "993",
        min: 1,
        max: 65535,
      },
      {
        key: "imap_secure",
        label: "IMAP SSL (port 993)",
        type: "boolean",
        defaultValue: "true",
      },
      {
        key: "imap_user",
        label: "IMAP Kullanıcı Adı",
        type: "text",
        placeholder: "info@alanadiniz.com",
        defaultValue: "",
      },
      {
        key: "imap_password",
        label: "IMAP Şifresi",
        type: "password",
        placeholder: "••••••••",
        defaultValue: "",
        preserveIfEmpty: true,
      },
      {
        key: "imap_folder",
        label: "IMAP Klasörü",
        type: "text",
        placeholder: "INBOX",
        defaultValue: "INBOX",
      },
      {
        key: "mail_inbox_filter_mode",
        label: "Admin paneline gelecek mailler",
        type: "text",
        placeholder: "contact_only",
        defaultValue: "contact_only",
      },
      {
        key: "mail_inbox_subject_filter",
        label: "Konu filtresi",
        type: "text",
        placeholder: "[İletişim]",
        defaultValue: "[İletişim]",
      },
      {
        key: "mail_inbox_to_filter",
        label: "Alıcı adresi filtresi",
        type: "email",
        placeholder: "info@alanadiniz.com",
        defaultValue: "",
      },
    ],
  },
];

/** Performans ayarları — ayrı admin sayfasında yönetilir */
export const performanceSettingGroups: SettingGroupDef[] = [
  {
    id: "perf_loading",
    title: "Yükleme & Kaynaklar",
    description: "İlk açılış hızını etkileyen kaynak yükleme davranışları",
    fields: [
      {
        key: "perf_lazy_images",
        label: "Görselleri Lazy Load Et",
        type: "boolean",
        hint: "Ekran dışı görselleri gecikmeli yükler; LCP için kritik görseller hariç tutulabilir",
        defaultValue: "true",
      },
      {
        key: "perf_lazy_iframes",
        label: "Iframe’leri Lazy Load Et",
        type: "boolean",
        hint: "Harita ve video gömmelerini görünür olunca yükler",
        defaultValue: "true",
      },
      {
        key: "perf_preload_logo",
        label: "Logoyu Preload Et",
        type: "boolean",
        hint: "Site logosunu kritik kaynak olarak erken yükler",
        defaultValue: "true",
      },
      {
        key: "perf_font_display_swap",
        label: "Font Display: Swap",
        type: "boolean",
        hint: "Yazı tipleri yüklenene kadar sistem fontu gösterir; metin gecikmesini azaltır",
        defaultValue: "true",
      },
      {
        key: "perf_prefetch_links",
        label: "Bağlantı Prefetch",
        type: "boolean",
        hint: "Hover / görünür linkler için Next.js prefetch davranışını etkin tutar",
        defaultValue: "true",
      },
    ],
  },
  {
    id: "perf_hints",
    title: "Resource Hints",
    description: "DNS ve bağlantı ipuçları — üçüncü parti servisleri hızlandırır",
    fields: [
      {
        key: "perf_preconnect",
        label: "Preconnect Domainleri",
        type: "textarea",
        placeholder: "https://fonts.googleapis.com\nhttps://fonts.gstatic.com\nhttps://www.googletagmanager.com",
        hint: "Her satıra bir origin (https://...). Erken TCP/TLS bağlantısı açar",
        defaultValue:
          "https://fonts.googleapis.com\nhttps://fonts.gstatic.com\nhttps://www.googletagmanager.com",
      },
      {
        key: "perf_dns_prefetch",
        label: "DNS Prefetch Domainleri",
        type: "textarea",
        placeholder: "https://www.google-analytics.com\nhttps://www.youtube.com",
        hint: "Her satıra bir origin. Daha hafif; sadece DNS çözümlemesi yapar",
        defaultValue: "https://www.google-analytics.com",
      },
    ],
  },
  {
    id: "perf_scripts",
    title: "Script & Üçüncü Parti",
    description: "Analitik ve harici scriptlerin yükleme stratejisi",
    fields: [
      {
        key: "perf_defer_analytics",
        label: "Analitiği Ertele",
        type: "boolean",
        hint: "Google Analytics / Tag Manager’ı sayfa etkileşiminden veya idle sonrasına erteler",
        defaultValue: "true",
      },
      {
        key: "perf_analytics_delay_ms",
        label: "Analitik Gecikmesi (ms)",
        type: "text",
        placeholder: "3000",
        hint: "Erteleme aktifken varsayılan bekleme süresi (milisaniye)",
        defaultValue: "3000",
      },
      {
        key: "perf_disable_third_party",
        label: "Üçüncü Parti Scriptleri Kapat",
        type: "boolean",
        hint: "Geçici olarak analitik ve harici takip kodlarını tamamen kapatır (test / hız için)",
        defaultValue: "false",
      },
    ],
  },
  {
    id: "perf_cache",
    title: "Önbellek & CDN",
    description: "Statik dosya önbelleği ve CDN ayarları",
    fields: [
      {
        key: "perf_asset_cache_days",
        label: "Statik Dosya Cache Süresi (gün)",
        type: "text",
        placeholder: "365",
        hint: "/uploads ve uzun ömürlü statik varlıklar için önerilen: 30–365 gün",
        defaultValue: "365",
      },
      {
        key: "perf_html_cache_seconds",
        label: "HTML Cache (saniye)",
        type: "text",
        placeholder: "0",
        hint: "0 = dinamik HTML cache yok. CDN kullanıyorsanız 60–300 deneyebilirsiniz",
        defaultValue: "0",
      },
      {
        key: "perf_cdn_url",
        label: "CDN / Asset Base URL",
        type: "url",
        placeholder: "https://cdn.ornek.com",
        hint: "Boş bırakılırsa site kendi domain’ini kullanır. CDN kullanıyorsanız origin’i yazın",
        defaultValue: "",
      },
      {
        key: "perf_stale_while_revalidate",
        label: "Stale-While-Revalidate",
        type: "boolean",
        hint: "Eski içeriği anında gösterip arka planda yeniler; algılanan hızı artırır",
        defaultValue: "true",
      },
    ],
  },
  {
    id: "perf_images",
    title: "Görsel Performansı",
    description: "Görsel formatları ve boyutlandırma politikası",
    fields: [
      {
        key: "perf_image_webp",
        label: "WebP / AVIF Önceliği",
        type: "boolean",
        hint: "Next.js Image optimizasyonunda modern formatları tercih eder",
        defaultValue: "true",
      },
      {
        key: "perf_image_quality",
        label: "Varsayılan Görsel Kalitesi (1–100)",
        type: "text",
        placeholder: "75",
        hint: "Düşük değer = daha küçük dosya. Önerilen aralık: 70–85",
        defaultValue: "75",
      },
      {
        key: "perf_responsive_images",
        label: "Responsive Görseller",
        type: "boolean",
        hint: "Cihaza göre uygun boyutlu görseller sunar (srcset)",
        defaultValue: "true",
      },
    ],
  },
  {
    id: "perf_ux",
    title: "UX & Erişilebilirlik Performansı",
    description: "Algılanan hız ve kullanıcı deneyimi",
    fields: [
      {
        key: "perf_reduce_motion",
        label: "Animasyonları Azalt (Tercih)",
        type: "boolean",
        hint: "Kullanıcı prefers-reduced-motion istediğinde ağır animasyonları kapatır",
        defaultValue: "true",
      },
      {
        key: "perf_instant_scroll",
        label: "Smooth Scroll",
        type: "boolean",
        hint: "Sayfa içi kaydırmayı yumuşatır (düşük cihazlarda kapatılabilir)",
        defaultValue: "false",
      },
      {
        key: "perf_show_loading_indicator",
        label: "Sayfa Geçiş Göstergesi",
        type: "boolean",
        hint: "Rota değişimlerinde ince bir yükleme çubuğu gösterir",
        defaultValue: "true",
      },
    ],
  },
];

export type SettingsScope =
  | "general"
  | "performance"
  | "theme"
  | "membership"
  | "pricing"
  | "all";

export function getSettingGroupsByScope(scope: SettingsScope): SettingGroupDef[] {
  switch (scope) {
    case "general":
      return settingGroups;
    case "performance":
      return performanceSettingGroups;
    case "theme":
      return themeSettingGroups;
    case "membership":
      return membershipSettingGroups;
    case "pricing":
      return pricingSettingGroups;
    case "all":
      return [
        ...settingGroups,
        ...performanceSettingGroups,
        ...themeSettingGroups,
        ...membershipSettingGroups,
        ...pricingSettingGroups,
      ];
    default: {
      const _exhaustive: never = scope;
      return _exhaustive;
    }
  }
}

export function getAllSettingDefs(): SettingFieldDef[] {
  return getSettingGroupsByScope("all").flatMap((group) => group.fields);
}

export function getSettingDefsByScope(scope: SettingsScope): SettingFieldDef[] {
  return getSettingGroupsByScope(scope).flatMap((group) => group.fields);
}
