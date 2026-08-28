import type { ReactNode } from "react";
import { Mail, MapPin, Phone } from "lucide-react";
import { SiteImage } from "@/components/site/site-image";
import { SiteLink } from "@/components/site/site-link";
import { LucideIconByName } from "@/lib/lucide-icons";
import { stripHtml } from "@/lib/html";
import { workCategoryHref } from "@/lib/works";

export type WorkDetailSkill = {
  id: string;
  name: string;
  description?: string | null;
  icon?: string | null;
};

export type WorkDetailRelatedProject = {
  id: string;
  title: string;
  slug: string;
  summary?: string | null;
  image?: string | null;
};

type WorkDetailViewProps = {
  title: string;
  summary?: string | null;
  content?: string | null;
  image?: string | null;
  categoryName?: string | null;
  categorySlug?: string | null;
  phone?: string;
  email?: string;
  address?: string;
  social?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
  };
  disableThirdParty?: boolean;
  skills: WorkDetailSkill[];
  relatedProjects: WorkDetailRelatedProject[];
  sidebar?: ReactNode;
  sidebarPlacement?: "LEFT" | "RIGHT";
};

function SocialLink({
  href,
  label,
  glyph,
}: {
  href: string;
  label: string;
  glyph: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-site-border bg-site-card text-[10px] font-bold tracking-wide text-site-muted uppercase transition hover:border-site-primary/40 hover:text-site-primary"
    >
      {glyph}
    </a>
  );
}

export function WorkDetailView({
  title,
  summary,
  content,
  image,
  categoryName,
  categorySlug,
  phone,
  email,
  address,
  social,
  disableThirdParty = false,
  skills,
  relatedProjects,
  sidebar,
  sidebarPlacement = "RIGHT",
}: WorkDetailViewProps) {
  const summaryText = stripHtml(summary);
  const hasContact = Boolean(phone || email || address);
  const socialLinks = disableThirdParty
    ? []
    : (
        [
          social?.facebook
            ? { href: social.facebook, label: "Facebook", glyph: "Fb" }
            : null,
          social?.twitter
            ? { href: social.twitter, label: "X / Twitter", glyph: "X" }
            : null,
          social?.instagram
            ? { href: social.instagram, label: "Instagram", glyph: "Ig" }
            : null,
          social?.linkedin
            ? { href: social.linkedin, label: "LinkedIn", glyph: "In" }
            : null,
        ] as const
      ).filter((item): item is { href: string; label: string; glyph: string } =>
        Boolean(item),
      );

  return (
    <>
      <section className="relative overflow-hidden border-b border-site-border bg-site-surface py-12 sm:py-14">
        <div className="pointer-events-none absolute inset-0 site-soft-glow opacity-70" />
        <div className="relative mx-auto grid max-w-7xl px-4 sm:px-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-0 lg:px-8">
          <div className="lg:col-span-2">
          <h1 className="font-display text-3xl font-bold tracking-tight text-site-fg sm:text-5xl">
            {title}
          </h1>
          <nav className="mt-3 text-sm text-site-primary">
            <SiteLink href="/" className="hover:underline">
              Ana Sayfa
            </SiteLink>
            <span className="mx-2 text-site-muted">›</span>
            <SiteLink href="/yapilan-isler" className="hover:underline">
              Yapılan İşler
            </SiteLink>
            {categoryName && categorySlug ? (
              <>
                <span className="mx-2 text-site-muted">›</span>
                <SiteLink
                  href={workCategoryHref(categorySlug)}
                  className="hover:underline"
                >
                  {categoryName}
                </SiteLink>
              </>
            ) : null}
            <span className="mx-2 text-site-muted">›</span>
            <span className="text-site-muted">{title}</span>
          </nav>
          </div>
        </div>
      </section>

      <section className="relative bg-[#f6f7fb] py-10 sm:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <article className="overflow-hidden rounded-[1.75rem] border border-site-border bg-white shadow-[0_20px_60px_-28px_rgba(15,23,42,0.35)]">
            <div className="grid lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
              <div className="relative min-h-[18rem] bg-slate-100 sm:min-h-[22rem] lg:min-h-full">
                <SiteImage
                  src={
                    image ||
                    "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80"
                  }
                  alt={title}
                  fill
                  priority
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 48vw"
                />
              </div>

              <div className="flex flex-col justify-center p-6 sm:p-8 lg:p-10">
                <h2 className="font-display text-2xl font-bold tracking-tight text-site-fg sm:text-3xl">
                  {title}
                </h2>
                {categoryName ? (
                  <p className="mt-1 text-sm font-medium text-site-muted">
                    {categoryName}
                  </p>
                ) : null}
                {summaryText ? (
                  <p className="mt-4 max-w-xl text-sm leading-relaxed text-site-muted sm:text-[15px]">
                    {summaryText}
                  </p>
                ) : null}

                {hasContact ? (
                  <ul className="mt-6 space-y-3 text-sm text-site-fg">
                    {phone ? (
                      <li className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-site-primary-soft text-site-primary">
                          <Phone className="h-4 w-4" />
                        </span>
                        <a
                          href={`tel:${phone.replace(/\s+/g, "")}`}
                          className="pt-1.5 hover:text-site-primary"
                        >
                          {phone}
                        </a>
                      </li>
                    ) : null}
                    {email ? (
                      <li className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-site-primary-soft text-site-primary">
                          <Mail className="h-4 w-4" />
                        </span>
                        <a
                          href={`mailto:${email}`}
                          className="pt-1.5 break-all hover:text-site-primary"
                        >
                          {email}
                        </a>
                      </li>
                    ) : null}
                    {address ? (
                      <li className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-site-primary-soft text-site-primary">
                          <MapPin className="h-4 w-4" />
                        </span>
                        <span className="pt-1.5 leading-relaxed text-site-muted">
                          {address}
                        </span>
                      </li>
                    ) : null}
                  </ul>
                ) : null}

                {socialLinks.length > 0 ? (
                  <div className="mt-6 flex flex-wrap gap-2">
                    {socialLinks.map((item) => (
                      <SocialLink key={item.href} {...item} />
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="bg-white py-12 sm:py-16">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-14 lg:px-8">
          <div
            className={`min-w-0 ${sidebarPlacement === "LEFT" ? "lg:order-2" : ""}`}
          >
            {content?.trim() ? (
              <div
                className="site-rich-content"
                dangerouslySetInnerHTML={{ __html: content }}
              />
            ) : summaryText ? (
              <p className="text-base leading-relaxed text-site-muted">
                {summaryText}
              </p>
            ) : (
              <p className="text-sm text-site-muted">
                Bu çalışma için detaylı içerik yakında eklenecek.
              </p>
            )}

            {relatedProjects.length > 0 ? (
              <div className="mt-10 border-t border-site-border pt-8">
                <h3 className="font-display text-xl font-bold text-site-fg">
                  İlgili Projeler
                </h3>
                <ul className="mt-5 space-y-4">
                  {relatedProjects.map((project) => (
                    <li key={project.id}>
                      <SiteLink
                        href={`/projeler/${project.slug}`}
                        className="group grid overflow-hidden rounded-2xl border border-site-border bg-site-card shadow-sm transition hover:-translate-y-0.5 hover:border-site-primary/35 hover:shadow-lg sm:grid-cols-[11rem_minmax(0,1fr)]"
                      >
                        <span className="relative aspect-[16/11] bg-slate-100 sm:aspect-auto sm:min-h-[8.5rem]">
                          {project.image ? (
                            <SiteImage
                              src={project.image}
                              alt={project.title}
                              fill
                              className="object-cover transition duration-500 group-hover:scale-105"
                              sizes="(max-width: 640px) 100vw, 176px"
                            />
                          ) : (
                            <span className="absolute inset-0 bg-gradient-to-br from-violet-100 to-slate-100" />
                          )}
                        </span>
                        <span className="flex min-w-0 flex-col justify-center px-5 py-4 sm:py-5">
                          <span className="font-display text-base font-bold tracking-tight text-site-fg group-hover:text-site-primary">
                            {project.title}
                          </span>
                          {project.summary ? (
                            <span className="mt-1.5 text-sm leading-6 text-site-muted line-clamp-2">
                              {stripHtml(project.summary)}
                            </span>
                          ) : null}
                          <span className="mt-3 inline-flex items-center text-sm font-semibold text-site-primary">
                            Projeyi incele
                            <span aria-hidden className="ml-1 transition group-hover:translate-x-0.5">
                              →
                            </span>
                          </span>
                        </span>
                      </SiteLink>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <aside
            className={`space-y-5 lg:sticky lg:top-28 lg:self-start ${
              sidebarPlacement === "LEFT" ? "lg:order-1" : ""
            }`}
          >
            {sidebar}
            <div className="rounded-[1.5rem] border border-site-border bg-[#f8f7fc] p-6 sm:p-7">
              <h3 className="font-display text-xl font-bold text-site-fg">
                Yetenekler & Deneyim
              </h3>
              {skills.length > 0 ? (
                <ul className="mt-6 space-y-5">
                  {skills.map((skill) => (
                    <li key={skill.id} className="flex gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-site-primary-soft text-site-primary">
                        {skill.icon ? (
                          <LucideIconByName
                            name={skill.icon}
                            className="h-5 w-5"
                          />
                        ) : (
                          <span className="h-2 w-2 rounded-full bg-site-primary" />
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-site-fg">
                          {skill.name}
                        </span>
                        {skill.description ? (
                          <span className="mt-1 block text-sm leading-relaxed text-site-muted">
                            {stripHtml(skill.description)}
                          </span>
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-sm text-site-muted">
                  Bu çalışmaya bağlı özellik veya proje henüz tanımlanmamış.
                </p>
              )}
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
