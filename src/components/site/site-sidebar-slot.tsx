import Image from "next/image";
import type { ReactNode } from "react";
import type { SidebarLocation } from "@prisma/client";
import { Clock3, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { BlogCategorySidebar } from "@/components/site/blog/blog-category-sidebar";
import { ProjectCategorySidebar } from "@/components/site/project/project-category-sidebar";
import { WorkCategorySidebar } from "@/components/site/work/work-category-sidebar";
import { SiteLink } from "@/components/site/site-link";
import { getDefaultContactInfoBlockConfig } from "@/config/contact-info-block";
import { getCachedBlogCategoryIndex } from "@/lib/blog";
import { prepareRichHtml } from "@/lib/html";
import { getCachedProjectCategoryIndex } from "@/lib/projects";
import { getSettingsMap } from "@/lib/settings";
import {
  getSidebarByLocation,
  type SiteSidebarView,
  type SiteSidebarWidgetView,
} from "@/lib/site-sidebars";
import { getCachedWorkCategoryIndex } from "@/lib/works";

function whatsappHref(raw: string) {
  const digits = raw.replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : raw;
}

function WidgetShell({
  title,
  children,
}: {
  title?: string | null;
  children: ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-site-border bg-site-card p-5 shadow-sm">
      {title ? (
        <h2 className="font-display text-lg font-semibold text-site-fg">
          {title}
        </h2>
      ) : null}
      <div className={title ? "mt-3" : undefined}>{children}</div>
    </div>
  );
}

async function ContactWidget({
  widget,
}: {
  widget: SiteSidebarWidgetView;
}) {
  const settings = await getSettingsMap().catch(
    () => ({}) as Record<string, string>,
  );
  const config = widget.settings.contact ?? getDefaultContactInfoBlockConfig();
  const contact = {
    email: settings.contact_email,
    phone: settings.contact_phone,
    whatsapp: settings.contact_whatsapp,
    address: settings.contact_address,
    workingHours: settings.contact_working_hours,
    mapEmbed: settings.contact_map_embed,
  };

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
  const intro = config.introText?.trim();

  if (items.length === 0 && !showMap && !intro) return null;

  return (
    <WidgetShell title={widget.title || "İletişim"}>
      {intro ? <p className="text-sm text-site-muted">{intro}</p> : null}
      {items.length > 0 ? (
        <ul className={`space-y-3 ${intro ? "mt-4" : ""}`}>
          {items.map((item) => {
            const Icon = item.icon;
            const value = item.href ? (
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
                  <div className="mt-0.5">{value}</div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
      {showMap ? (
        <div
          className="mt-4 overflow-hidden rounded-2xl border border-site-border [&_iframe]:aspect-video [&_iframe]:h-auto [&_iframe]:w-full"
          dangerouslySetInnerHTML={{ __html: contact.mapEmbed! }}
        />
      ) : null}
    </WidgetShell>
  );
}

async function CategoryWidget({
  widget,
  activeSlug,
}: {
  widget: SiteSidebarWidgetView & {
    type: "BLOG_CATEGORIES" | "WORK_CATEGORIES" | "PROJECT_CATEGORIES";
  };
  activeSlug?: string | null;
}) {
  const showCounts = widget.settings.showCounts !== false;
  const showAllLink = widget.settings.showAllLink !== false;
  const title = widget.title || "Kategoriler";

  switch (widget.type) {
    case "BLOG_CATEGORIES": {
      const categories = await getCachedBlogCategoryIndex().catch(() => []);
      return (
        <BlogCategorySidebar
          categories={categories}
          activeSlug={activeSlug}
          title={title}
          showCounts={showCounts}
          showAllLink={showAllLink}
          embedded
        />
      );
    }
    case "WORK_CATEGORIES": {
      const categories = await getCachedWorkCategoryIndex().catch(() => []);
      return (
        <WorkCategorySidebar
          categories={categories}
          activeSlug={activeSlug}
          title={title}
          showCounts={showCounts}
          showAllLink={showAllLink}
          embedded
        />
      );
    }
    case "PROJECT_CATEGORIES": {
      const categories = await getCachedProjectCategoryIndex().catch(() => []);
      return (
        <ProjectCategorySidebar
          categories={categories}
          activeSlug={activeSlug}
          title={title}
          showCounts={showCounts}
          showAllLink={showAllLink}
          embedded
        />
      );
    }
    default: {
      const _exhaustive: never = widget.type;
      return _exhaustive;
    }
  }
}

async function SidebarWidget({
  widget,
  activeSlug,
}: {
  widget: SiteSidebarWidgetView;
  activeSlug?: string | null;
}) {
  switch (widget.type) {
    case "BLOG_CATEGORIES":
      return (
        <CategoryWidget
          widget={{ ...widget, type: "BLOG_CATEGORIES" }}
          activeSlug={activeSlug}
        />
      );
    case "WORK_CATEGORIES":
      return (
        <CategoryWidget
          widget={{ ...widget, type: "WORK_CATEGORIES" }}
          activeSlug={activeSlug}
        />
      );
    case "PROJECT_CATEGORIES":
      return (
        <CategoryWidget
          widget={{ ...widget, type: "PROJECT_CATEGORIES" }}
          activeSlug={activeSlug}
        />
      );
    case "CONTACT_INFO":
      return <ContactWidget widget={widget} />;
    case "RICH_TEXT": {
      const html = prepareRichHtml(widget.content, {
        lazyImages: true,
        lazyIframes: true,
        disableThirdParty: false,
      });
      if (!html.trim()) return null;
      return (
        <WidgetShell title={widget.title}>
          <div
            className="site-rich-content text-sm"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </WidgetShell>
      );
    }
    case "IMAGE": {
      if (!widget.imagePath) return null;
      const image = (
        <span className="relative block aspect-[4/3] overflow-hidden rounded-2xl bg-slate-100">
          <Image
            src={widget.imagePath}
            alt={widget.imageAlt || widget.title || ""}
            fill
            className="object-cover"
            sizes="280px"
          />
        </span>
      );
      const link = widget.settings.imageLinkUrl?.trim();
      const isExternal = Boolean(link && /^https?:\/\//i.test(link));
      return (
        <WidgetShell title={widget.title}>
          {link ? (
            isExternal ? (
              <a
                href={link}
                target="_blank"
                rel="noreferrer"
                className="block overflow-hidden rounded-2xl"
              >
                {image}
              </a>
            ) : (
              <SiteLink href={link} className="block overflow-hidden rounded-2xl">
                {image}
              </SiteLink>
            )
          ) : (
            image
          )}
        </WidgetShell>
      );
    }
    default: {
      const _exhaustive: never = widget.type;
      return _exhaustive;
    }
  }
}

export function SiteSidebarRenderer({
  sidebar,
  activeSlug = null,
  embedded = false,
}: {
  sidebar: SiteSidebarView;
  activeSlug?: string | null;
  embedded?: boolean;
}) {
  const content = (
    <>
      {sidebar.widgets.map((widget) => (
        <SidebarWidget
          key={widget.id}
          widget={widget}
          activeSlug={activeSlug}
        />
      ))}
    </>
  );

  if (embedded) {
    return <div className="space-y-5">{content}</div>;
  }

  return (
    <aside className="space-y-5 lg:sticky lg:top-28 lg:self-start">
      {content}
    </aside>
  );
}

export async function SiteSidebarSlot({
  location,
  fallback = null,
  activeSlug = null,
  embedded = false,
}: {
  location: SidebarLocation;
  fallback?: ReactNode;
  activeSlug?: string | null;
  embedded?: boolean;
}) {
  const sidebar = await getSidebarByLocation(location);
  if (!sidebar) return fallback ?? null;
  return (
    <SiteSidebarRenderer
      sidebar={sidebar}
      activeSlug={activeSlug}
      embedded={embedded}
    />
  );
}
