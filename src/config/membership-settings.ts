import type { SettingGroupDef } from "@/config/settings";

export const membershipSettingGroups: SettingGroupDef[] = [
  {
    id: "membership_general",
    title: "Üyelik Sistemi",
    description: "Site genelinde üye kayıt ve giriş özelliklerini yönetin",
    fields: [
      {
        key: "membership_enabled",
        label: "Üyelik sistemini aç",
        type: "boolean",
        hint: "Kapalıyken kayıt/giriş linkleri ve üye paneli gizlenir; paket satın alma durur.",
        defaultValue: "false",
      },
      {
        key: "membership_allow_register",
        label: "E-posta ile kayda izin ver",
        type: "boolean",
        hint: "Açıkken ziyaretçiler /kayit sayfasından üye olabilir.",
        defaultValue: "true",
      },
      {
        key: "membership_stripe_enabled",
        label: "Stripe ile paket satışı",
        type: "boolean",
        hint: "Açıkken satın alınabilir paketler Stripe Checkout’a yönlendirilir. STRIPE_* env anahtarları gerekir.",
        defaultValue: "false",
      },
    ],
  },
  {
    id: "membership_oauth",
    title: "Sosyal Giriş",
    description:
      "Provider’ları açmadan önce .env içinde ilgili AUTH_* kimlik bilgilerini tanımlayın. Tanımsız provider’lar sitede görünmez.",
    fields: [
      {
        key: "membership_oauth_google",
        label: "Google ile giriş",
        type: "boolean",
        defaultValue: "false",
      },
      {
        key: "membership_oauth_github",
        label: "GitHub ile giriş",
        type: "boolean",
        defaultValue: "false",
      },
      {
        key: "membership_oauth_facebook",
        label: "Facebook ile giriş",
        type: "boolean",
        defaultValue: "false",
      },
      {
        key: "membership_oauth_apple",
        label: "Apple ile giriş",
        type: "boolean",
        defaultValue: "false",
      },
    ],
  },
];
