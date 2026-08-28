import { Clock3, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import type { ContactInfoBlockConfig } from "@/config/contact-info-block";
import { getDefaultContactInfoBlockConfig } from "@/config/contact-info-block";
import { SectionHeading } from "@/components/site/section-heading";
import { normalizeSectionText } from "@/lib/section-display-text";

export type SiteContactDetails = {
  email?: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  workingHours?: string;
  mapEmbed?: string;
};

type ContactInfoSectionProps = {
  title?: string | null;
  subtitle?: string | null;
  eyebrow?: string | null;
  config?: ContactInfoBlockConfig | null;
  contact: SiteContactDetails;
};

function whatsappHref(raw: string) {
  const digits = raw.replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : raw;
}

export function ContactInfoSection({
  title,
  subtitle,
  eyebrow,
  config: configProp,
  contact,
}: ContactInfoSectionProps) {
  const config = configProp ?? getDefaultContactInfoBlockConfig();
  const eyebrowText = normalizeSectionText(eyebrow);
  const titleText = normalizeSectionText(title);
  const subtitleText = normalizeSectionText(subtitle);
  const introText = normalizeSectionText(config.introText);

  const items: {
    key: string;
    icon: typeof Mail;
    label: string;
    href?: string;
    value: string;
  }[] = [];

  if (config.showEmail && contact.email) {
    items.push({
      key: "email",
      icon: Mail,
      label: "E-posta",
      href: `mailto:${contact.email}`,
      value: contact.email,
    });
  }
  if (config.showPhone && contact.phone) {
    items.push({
      key: "phone",
      icon: Phone,
      label: "Telefon",
      href: `tel:${contact.phone.replace(/\s+/g, "")}`,
      value: contact.phone,
    });
  }
  if (config.showWhatsapp && contact.whatsapp) {
    items.push({
      key: "whatsapp",
      icon: MessageCircle,
      label: "WhatsApp",
      href: whatsappHref(contact.whatsapp),
      value: contact.whatsapp,
    });
  }
  if (config.showAddress && contact.address) {
    items.push({
      key: "address",
      icon: MapPin,
      label: "Adres",
      value: contact.address,
    });
  }
  if (config.showWorkingHours && contact.workingHours) {
    items.push({
      key: "hours",
      icon: Clock3,
      label: "Çalışma saatleri",
      value: contact.workingHours,
    });
  }

  const showMap = config.showMap && Boolean(contact.mapEmbed?.trim());
  const hasHeading = Boolean(eyebrowText || titleText || subtitleText);

  if (items.length === 0 && !showMap && !hasHeading && !introText) {
    return null;
  }

  return (
    <section className="py-10 sm:py-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {hasHeading ? (
          <SectionHeading
            eyebrow={eyebrowText}
            title={titleText}
            subtitle={subtitleText}
            className="mb-6"
          />
        ) : null}

        <div className="rounded-3xl border border-site-border bg-site-card p-6 shadow-sm sm:p-8">
          {introText ? (
            <p className="text-sm text-site-muted">{introText}</p>
          ) : null}

          {items.length > 0 ? (
            <ul className={`space-y-4 ${introText ? "mt-6" : ""}`}>
              {items.map((item) => {
                const Icon = item.icon;
                const content = item.href ? (
                  <a
                    href={item.href}
                    className="text-site-fg hover:text-site-primary"
                    target={item.key === "whatsapp" ? "_blank" : undefined}
                    rel={item.key === "whatsapp" ? "noreferrer" : undefined}
                  >
                    {item.value}
                  </a>
                ) : (
                  <span className="text-site-fg">{item.value}</span>
                );

                return (
                  <li key={item.key} className="flex items-start gap-3 text-sm">
                    <span className="mt-0.5 rounded-full bg-site-primary/10 p-2 text-site-primary">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-xs font-medium tracking-wide text-site-muted uppercase">
                        {item.label}
                      </p>
                      <div className="mt-0.5">{content}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : null}

          {showMap ? (
            <div
              className="mt-6 overflow-hidden rounded-2xl border border-site-border [&_iframe]:aspect-video [&_iframe]:h-auto [&_iframe]:w-full"
              dangerouslySetInnerHTML={{ __html: contact.mapEmbed! }}
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}
