# Eticaret — Mağaza ve Yönetim Paneli

Next.js 15 tabanlı e-ticaret sitesi. Vitrinde katalog, sepet, ödeme ve üye hesabı; admin’de ürün, sipariş, müşteri ve CMS birlikte çalışır. Veri Prisma + MySQL üzerindedir.

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=nextdotjs)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-MySQL-2D3748?logo=prisma)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Stripe](https://img.shields.io/badge/Stripe-Ödeme-635BFF?logo=stripe&logoColor=white)](https://stripe.com/)

---

## Özellikler

### Mağaza

- Ürün kataloğu: kategori, marka, varyant, filtre, KDV, stok
- Sepet (`localStorage`) ve çok adımlı ödeme: adres → kargo → ödeme
- Ödeme yöntemleri: havale / EFT, kapıda ödeme, kredi kartı (Stripe)
- Üye hesabı: üyelik bilgileri, adres defteri, siparişler
- Özelleştirilebilir katalog URL’leri (ön ek + isteğe bağlı kalıcı sayısal ID)
- Tema, menü, hero, sayfa builder ve performans ayarları

### Yönetim

- Velzon tarzı admin (sidebar, header, aydınlık / karanlık tema)
- Ürün, kategori, marka, tedarikçi, kargo, sipariş, müşteri
- Personel yetkileri (görüntüleme / oluşturma / güncelleme / silme)
- CMS: sayfalar, hero, kartlar, SSS, menüler, blog, projeler, yapılan işler
- Site ayarları: genel, görünüm, iletişim, SEO, e-posta, üyelik, tema
- TipTap editör, görsel yükleme / kırpma (Sharp → WebP)

---

## Teknoloji yığını

| Katman | Seçim |
| --- | --- |
| Framework | Next.js 15 (App Router), React 19 |
| Dil | TypeScript |
| Stil | Tailwind CSS 4 |
| Veritabanı | MySQL / MariaDB (XAMPP) |
| ORM | Prisma 6 |
| Auth | Auth.js (next-auth v5) — JWT + Credentials, isteğe bağlı OAuth |
| Ödeme | Stripe Checkout + webhook |
| Editör | TipTap |
| Sıralama | @dnd-kit |
| Görsel | Sharp, react-easy-crop |

---

## Mimari

```mermaid
flowchart LR
  Browser["Tarayıcı"] --> Next["Next.js App Router"]
  Next --> Store["Vitrin /(site)"]
  Next --> Admin["/admin CMS"]
  Store --> Cart["Sepet"]
  Store --> Checkout["/odeme"]
  Checkout --> Orders["Order"]
  Checkout --> Stripe["Stripe"]
  Admin --> Actions["Server Actions"]
  Actions --> Prisma["Prisma Client"]
  Prisma --> MySQL["MySQL"]
  Admin --> Uploads["public/uploads"]
```

- **Vitrin** `src/app/(site)` — katalog, sepet, ödeme, üye alanı, CMS sayfaları
- **Admin** `src/app/admin` — `(auth)` login, `(panel)` korumalı yönetim
- **Middleware** `/admin`, `/uye`, `/odeme` ve üye giriş rotalarını korur
- **Sepet** tarayıcıda (`eticaret.cart.v1`); sipariş sunucuda oluşur

---

## Proje yapısı

```text
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
├── public/uploads/           # yüklenen görseller (git’te yok)
├── scripts/                  # deploy ve yardımcı scriptler
└── src/
    ├── app/
    │   ├── (site)/           # vitrin, sepet, ödeme, üye, CMS
    │   ├── admin/(auth)/     # /admin/login
    │   ├── admin/(panel)/    # mağaza + CMS
    │   └── api/              # Auth.js, Stripe, e-posta
    ├── components/
    │   ├── admin/
    │   └── site/             # header, sepet, ödeme, katalog
    ├── config/
    ├── lib/                  # prisma, sepet, sipariş, URL, ayarlar
    ├── auth.ts
    └── middleware.ts
```

---

## Vitrin rotaları

Katalog ön ekleri **Ayarlar → SEO & Linkler** ile değişir. Varsayılanlar:

| Sayfa | Varsayılan adres |
| --- | --- |
| Katalog | `/katalog` |
| Ürün | `/{slug}` veya `/{slug}/{id}` |
| Kategori | `/kategori/{slug}` |
| Marka | `/marka/{slug}` |
| Sepet | `/sepet` |
| Ödeme | `/odeme?adim=adres` |
| Teşekkür | `/siparis/tesekkur/{referans}` |
| Hesabım | `/uye` |
| Adresler | `/uye/adresler` |
| Siparişler | `/uye/siparisler` |
| Giriş / kayıt | `/giris`, `/kayit` |
| Blog | `/blog`, `/blog/{slug}` |
| CMS sayfa | `/{slug}` (`anasayfa` → `/`) |

### Ödeme hunisi (reklam / analitik)

Adım değişince URL de değişir; `utm_*`, `gclid` gibi parametreler korunur.

| Adım | Adres |
| --- | --- |
| Adres | `/odeme?adim=adres` |
| Kargo | `/odeme?adim=kargo` |
| Ödeme | `/odeme?adim=odeme` |

Ödeme sayfasında vitrin header / footer gizlenir.

---

## Admin modülleri

| Grup | Modül | Rota |
| --- | --- | --- |
| Mağaza | Ürünler | `/admin/products` |
| | Kategoriler / markalar / varyantlar / filtreler | `/admin/products/...` |
| | Tedarikçiler, KDV | `/admin/products/suppliers`, `/admin/products/tax-rates` |
| | Kargo | `/admin/shipping` |
| | Siparişler | `/admin/orders` |
| | Müşteriler | `/admin/members` |
| İçerik | Sayfalar, hero, kartlar, SSS, menüler | `/admin/pages` … |
| | Blog, projeler, yapılan işler | `/admin/blog`, `/admin/projects`, `/admin/works` |
| Sistem | Genel ayarlar, üyelik, tema, performans | `/admin/settings` |
| | Personel | `/admin/staff` |
| | E-posta | `/admin/email` |

---

## Veri modeli (özet)

- **User / CustomerAddress / StaffPermission** — üye, adres, personel yetkisi
- **Product / ProductVariant / ProductCategory / Brand** — katalog
- **Order / OrderItem / OrderAddress / OrderPayment** — sipariş
- **ShippingCarrier / TaxRate / Supplier** — kargo, vergi, tedarik
- **Page / Hero / Menu / Blog / Work / Project** — CMS
- **Setting / Language / Translation** — site ayarları ve çeviri

---

## Kurulum

### Gereksinimler

- Node.js 20+
- XAMPP (Apache + MySQL) veya MySQL 8 / MariaDB

### 1. Veritabanı

phpMyAdmin’de bir veritabanı oluşturun (`utf8mb4` / `utf8mb4_general_ci`). Örnek ad: `ihsanakyildiz`.

### 2. Bağımlılıklar

```bash
npm install
```

### 3. Ortam değişkenleri

Proje kökünde `.env`:

```env
DATABASE_URL="mysql://root:@127.0.0.1:3306/ihsanakyildiz"
AUTH_SECRET="en-az-32-karakter-rastgele-bir-anahtar"
AUTH_URL="http://localhost:3000"

ADMIN_EMAIL="admin@ornek.com"
ADMIN_PASSWORD="güçlü-sifre"
ADMIN_NAME="Admin"
```

`ADMIN_*` yalnızca `npm run db:seed` ile kullanıcı tablosuna yazılır.

İsteğe bağlı Stripe (kart ödemesi):

```env
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
```

İsteğe bağlı üye OAuth:

```env
AUTH_GOOGLE_ID=""
AUTH_GOOGLE_SECRET=""
AUTH_GITHUB_ID=""
AUTH_GITHUB_SECRET=""
```

İsteğe bağlı ön yüz cache:

```env
PERF_HTML_CACHE_SECONDS="60"
PERF_ASSET_CACHE_DAYS="365"
PERF_STALE_WHILE_REVALIDATE="true"
```

### 4. Şema ve admin hesabı

```bash
npm run db:generate
npm run db:push
npm run db:seed
```

Migrasyon geçmişini kullanmak için `db:push` yerine:

```bash
npm run db:migrate
```

Eski bir migrasyon yerelde takılırsa şema `db:push` veya ilgili SQL ile eşitlenebilir; ardından `npx prisma generate`. Windows’ta Prisma `EPERM` verirse çalışan `node` / Next süreçlerini kapatıp generate’i tekrarlayın.

### 5. Geliştirme

```bash
npm run dev
```

- Mağaza: [http://localhost:3000](http://localhost:3000)
- Admin: [http://localhost:3000/admin/login](http://localhost:3000/admin/login)

`next.config` veya `middleware` değişince geliştirme sunucusunu yeniden başlatın.

---

## Canlıya alma (Apache / Hestia + PM2)

Canlıda Next.js Apache arkasında `127.0.0.1` üzerinde çalışır. `AUTH_URL` tarayıcıdaki kanonik kök ile aynı olmalıdır (`www` varsa `www` yazın). Reverse proxy için:

```env
AUTH_TRUST_HOST=true
AUTH_URL="https://www.ornek.com"
```

`next.config.ts` → `experimental.serverActions.allowedOrigins` listesine domain ekleyip yeniden derleyin.

```bash
npm ci
npx prisma generate
npx prisma db push    # yalnızca şema değiştiyse
npx prisma db seed    # users boşsa
npm run build
PORT=3001 HOSTNAME=127.0.0.1 NODE_ENV=production pm2 start npm --name eticaret -- start
```

Kod güncellemesi için `bash scripts/deploy-live.sh` veya `git pull` + `npm ci` + `build` + `pm2 restart`.

**`public/uploads` Git’te yoktur.** Canlıda `git clean` veya `rm -rf public/uploads` çalıştırmayın.

Apache’de `/uploads` için `Alias` veya `public_html/uploads` sembolik bağı gerekir; aksi halde görseller 404 olur.

Girişte Application error (`UntrustedHost` / Server Action Origin uyuşmazlığı) görürseniz `X-Forwarded-Host`, `AUTH_URL` ve tarayıcı adresini aynı kanonik hostta tutun.

---

## npm komutları

| Komut | Açıklama |
| --- | --- |
| `npm run dev` | Geliştirme sunucusu |
| `npm run build` | Üretim derlemesi |
| `npm run start` | Derlenmiş uygulamayı çalıştır |
| `npm run lint` | ESLint |
| `npm run db:generate` | Prisma Client üret |
| `npm run db:migrate` | Migrasyon |
| `npm run db:push` | Şemayı veritabanına yansıt |
| `npm run db:seed` | Admin / örnek veri |
| `npm run db:studio` | Prisma Studio |

---

## Notlar

- `.env` ve `public/uploads/**` git’e eklenmez.
- Sepet tarayıcıda tutulur; sipariş için üye veya admin oturumu gerekir.
- Kart ödemesi için Stripe anahtarı ve webhook (`/api/stripe/webhook`) şarttır.
- Pasif / gizli ürünler vitrinde listelenmez; admin “Sitede aç” 404 verebilir.
