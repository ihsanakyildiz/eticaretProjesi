import { SiteLink } from "@/components/site/site-link";
import { Mail, MapPin, Phone } from "lucide-react";
import type { SiteNavItem } from "./site-types";

type SiteFooterProps = {
  siteName: string;
  description?: string;
  phone?: string;
  email?: string;
  address?: string;
  items: SiteNavItem[];
};

function SocialGlyph({ label }: { label: string }) {
  return (
    <span className="text-[10px] font-bold tracking-wide uppercase">{label}</span>
  );
}

export function SiteFooter({
  siteName,
  description = "Web tasarım, yazılım ve dijital çözümlerle markanızı büyütüyoruz.",
  phone,
  email,
  address,
  items,
}: SiteFooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-site-border bg-site-surface">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
        <div className="md:col-span-2 lg:col-span-1">
          <SiteLink href="/" className="inline-flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-site-primary text-sm font-bold text-white">
              {siteName.slice(0, 1).toUpperCase()}
            </span>
            <span className="text-lg font-bold text-site-fg">{siteName}</span>
          </SiteLink>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-site-muted">
            {description}
          </p>
          <div className="mt-5 flex gap-2">
            {["Fb", "Ig", "In"].map((label) => (
              <a
                key={label}
                href="#"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-site-border bg-site-card text-site-muted transition hover:border-site-primary hover:text-site-primary"
                aria-label="Sosyal medya"
              >
                <SocialGlyph label={label} />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold tracking-wide text-site-fg uppercase">
            Hızlı Linkler
          </h3>
          <ul className="mt-4 space-y-2">
            {items.slice(0, 6).map((item) => (
              <li key={item.href + item.label}>
                <SiteLink
                  href={item.href}
                  className="text-sm text-site-muted transition hover:text-site-primary"
                >
                  {item.label}
                </SiteLink>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold tracking-wide text-site-fg uppercase">
            Hizmetler
          </h3>
          <ul className="mt-4 space-y-2 text-sm text-site-muted">
            <li>
              <SiteLink href="/hizmetler" className="hover:text-site-primary">
                Web Tasarım
              </SiteLink>
            </li>
            <li>
              <SiteLink href="/hizmetler" className="hover:text-site-primary">
                Yazılım Geliştirme
              </SiteLink>
            </li>
            <li>
              <SiteLink href="/hizmetler" className="hover:text-site-primary">
                Kurumsal Kimlik
              </SiteLink>
            </li>
            <li>
              <SiteLink href="/projeler" className="hover:text-site-primary">
                Projeler
              </SiteLink>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold tracking-wide text-site-fg uppercase">
            İletişim
          </h3>
          <ul className="mt-4 space-y-3 text-sm text-site-muted">
            {phone ? (
              <li className="flex items-start gap-2">
                <Phone className="mt-0.5 h-4 w-4 text-site-primary" />
                <a href={`tel:${phone.replace(/\s/g, "")}`} className="hover:text-site-primary">
                  {phone}
                </a>
              </li>
            ) : null}
            {email ? (
              <li className="flex items-start gap-2">
                <Mail className="mt-0.5 h-4 w-4 text-site-primary" />
                <a href={`mailto:${email}`} className="hover:text-site-primary">
                  {email}
                </a>
              </li>
            ) : null}
            {address ? (
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 text-site-primary" />
                <span>{address}</span>
              </li>
            ) : null}
          </ul>
        </div>
      </div>

      <div className="border-t border-site-border">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-site-muted sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>
            © {year} {siteName}. Tüm hakları saklıdır.
          </p>
          <div className="flex gap-4">
            <SiteLink href="/gizlilik" className="hover:text-site-primary">
              Gizlilik
            </SiteLink>
            <SiteLink href="/iletisim" className="hover:text-site-primary">
              İletişim
            </SiteLink>
          </div>
        </div>
      </div>
    </footer>
  );
}
