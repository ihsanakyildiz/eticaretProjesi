import type { SettingGroupDef } from "@/config/settings";

export const paymentSettingGroups: SettingGroupDef[] = [
  {
    id: "payment_iyzico",
    title: "iyzico",
    description:
      "Türkiye kartları, 3D Secure ve taksit için iyzico Checkout Form. Anahtarları iyzico paneli → Ayarlar → API’den alın. Bildirim için ekstra panel URL’si gerekmez; ödeme sonucu /api/payments/iyzico/callback adresine döner.",
    fields: [
      {
        key: "payment_iyzico_enabled",
        label: "iyzico ile kart ödemesini aç",
        type: "boolean",
        hint: "Açıkken ödeme adımında “Kredi kartı (iyzico)” seçeneği görünür. 3D Secure ve taksit iyzico formunda sunulur.",
        defaultValue: "false",
      },
      {
        key: "payment_iyzico_sandbox",
        label: "Sandbox (test) ortamı",
        type: "boolean",
        hint: "Açıkken sandbox-api.iyzipay.com kullanılır. Canlıya geçince kapatın; canlı anahtarlar sandbox- öneki taşımaz.",
        defaultValue: "true",
      },
      {
        key: "payment_iyzico_api_key",
        label: "API Key",
        type: "password",
        preserveIfEmpty: true,
        placeholder: "sandbox-… veya canlı API key",
      },
      {
        key: "payment_iyzico_secret_key",
        label: "Secret Key",
        type: "password",
        preserveIfEmpty: true,
        placeholder: "iyzico secret key",
      },
      {
        key: "payment_iyzico_max_installment",
        label: "En fazla taksit",
        type: "number",
        min: 1,
        max: 12,
        defaultValue: "12",
        hint: "1 = yalnızca peşin. 2–12 arası değerler iyzico formunda taksit seçeneklerini açar (anlaşmanızdaki limit geçerlidir).",
      },
    ],
  },
  {
    id: "payment_paytr",
    title: "PayTR",
    description:
      "PayTR iFrame API: 3D Secure ve taksit kart sahibinin tarayıcısında tamamlanır. Mağaza paneli → Destek / Entegrasyon ayarlarında Bildirim URL olarak sitenizin /api/payments/paytr/notify adresini tanımlayın.",
    fields: [
      {
        key: "payment_paytr_enabled",
        label: "PayTR ile kart ödemesini aç",
        type: "boolean",
        hint: "Açıkken ödeme adımında “Kredi kartı (PayTR)” seçeneği görünür.",
        defaultValue: "false",
      },
      {
        key: "payment_paytr_test_mode",
        label: "Test modu",
        type: "boolean",
        hint: "PayTR test kartları için açık tutun. Canlı tahsilat için kapatın.",
        defaultValue: "true",
      },
      {
        key: "payment_paytr_merchant_id",
        label: "Mağaza no (merchant_id)",
        type: "text",
        placeholder: "PayTR mağaza numarası",
      },
      {
        key: "payment_paytr_merchant_key",
        label: "Mağaza parola (merchant_key)",
        type: "password",
        preserveIfEmpty: true,
        placeholder: "merchant_key",
      },
      {
        key: "payment_paytr_merchant_salt",
        label: "Mağaza gizli anahtar (merchant_salt)",
        type: "password",
        preserveIfEmpty: true,
        placeholder: "merchant_salt",
      },
      {
        key: "payment_paytr_max_installment",
        label: "En fazla taksit",
        type: "number",
        min: 0,
        max: 12,
        defaultValue: "12",
        hint: "0 = PayTR panelindeki en yüksek taksit. 1 = taksit gösterme (yalnızca peşin). 2–12 = üst sınır.",
      },
    ],
  },
];
