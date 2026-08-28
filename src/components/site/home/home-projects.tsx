"use client";

import { SiteImage } from "@/components/site/site-image";
import { SiteLink } from "@/components/site/site-link";
import { useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { stripHtml } from "@/lib/html";

export type ProjectHighlight = {
  title: string;
  summary: string;
  image?: string | null;
  href: string;
};

export type ProjectFeatureItem = {
  id: string;
  name: string;
  description?: string | null;
};

const FALLBACK_FEATURES: ProjectFeatureItem[] = [
  {
    id: "f1",
    name: "Özel Yazılım Geliştirme",
    description:
      "İş süreçlerinize özel, ölçeklenebilir ve güvenli yazılım ürünleri tasarlıyor ve geliştiriyoruz.",
  },
  {
    id: "f2",
    name: "Kurumsal Web Uygulamaları",
    description:
      "Yönetim panelleri, müşteri portalları ve entegrasyonlarla uçtan uca web çözümleri üretiyoruz.",
  },
  {
    id: "f3",
    name: "UI/UX & Marka Deneyimi",
    description:
      "Kullanıcı odaklı arayüzler ve tutarlı marka diliyle dönüşümü artırıyoruz.",
  },
  {
    id: "f4",
    name: "Bakım & Destek",
    description:
      "Yayın sonrası performans, güvenlik ve sürekli iyileştirme desteği sağlıyoruz.",
  },
];

const FALLBACK_PROJECTS: ProjectHighlight[] = [
  {
    title: "E-Ticaret Web Sitesi",
    summary:
      "Temiz arayüz, ödeme entegrasyonu ve gelişmiş arama özellikleriyle tam kapsamlı e-ticaret platformu.",
    image:
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=400&q=80",
    href: "/projeler",
  },
  {
    title: "Mobil Uygulama Tasarımı",
    summary:
      "Seyahat rezervasyonu için kullanıcı dostu navigasyon ve güçlü görsel dil.",
    image:
      "https://images.unsplash.com/photo-1512941932544-0fddf9f1d9f7?auto=format&fit=crop&w=400&q=80",
    href: "/projeler",
  },
  {
    title: "Portföy Web Sitesi",
    summary:
      "Hızlı, responsive ve minimal bir vitrin deneyimi ile yaratıcı işleri öne çıkarma.",
    image:
      "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=400&q=80",
    href: "/projeler",
  },
];

/** Split layout: aynı anda görünen proje kartı sayısı */
const VISIBLE_PROJECTS_SPLIT = 3;
/** Grid layout (accordion kapalı): 2 sütun × 4 satır */
const VISIBLE_PROJECTS_GRID = 8;

function ProjectCard({ project }: { project: ProjectHighlight }) {
  const summary =
    stripHtml(project.summary) || "Detaylar için projeyi inceleyin.";

  return (
    <SiteLink
      href={project.href}
      data-project-card
      className="group flex gap-4 rounded-3xl border border-site-border bg-site-card p-3 transition hover:border-site-primary/40 hover:shadow-lg"
    >
      <span className="relative h-24 w-28 shrink-0 overflow-hidden rounded-2xl sm:h-28 sm:w-36">
        <SiteImage
          src={
            project.image ||
            "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=400&q=80"
          }
          alt={project.title}
          fill
          className="object-cover transition duration-500 group-hover:scale-105"
          sizes="140px"
        />
      </span>
      <span className="min-w-0 flex-1 overflow-hidden py-1 pr-2">
        <span className="block truncate text-base font-semibold text-site-fg group-hover:text-site-primary">
          {project.title}
        </span>
        <span className="mt-1 line-clamp-3 text-sm leading-relaxed text-site-muted">
          {summary}
        </span>
      </span>
    </SiteLink>
  );
}

export function HomeProjects({
  projects,
  features,
  title,
  subtitle,
  eyebrow,
  statValue,
  statDescription,
  showFeatures = true,
}: {
  projects?: ProjectHighlight[];
  features?: ProjectFeatureItem[];
  title?: string | null;
  subtitle?: string | null;
  eyebrow?: string | null;
  statValue?: string | null;
  statDescription?: string | null;
  showFeatures?: boolean;
}) {
  const [openIndex, setOpenIndex] = useState(0);
  const sourceProjects =
    projects && projects.length > 0 ? projects : FALLBACK_PROJECTS;
  const showLeftPanel = showFeatures !== false;
  const accordion = showLeftPanel
    ? features && features.length > 0
      ? features
      : FALLBACK_FEATURES
    : [];
  const list = showLeftPanel
    ? sourceProjects
    : sourceProjects.slice(0, VISIBLE_PROJECTS_GRID);
  const scrollRef = useRef<HTMLDivElement>(null);
  const canSlide = showLeftPanel && list.length > VISIBLE_PROJECTS_SPLIT;

  const scrollByCard = (direction: -1 | 1) => {
    const root = scrollRef.current;
    if (!root) return;
    const card = root.querySelector<HTMLElement>("[data-project-card]");
    const gap = 16;
    const amount = (card?.offsetHeight ?? 120) + gap;
    root.scrollBy({ top: direction * amount, behavior: "smooth" });
  };

  const heading =
    title?.trim() || "Bizi öne çıkaran gurur duyduğumuz projeler";
  const lead = subtitle?.trim() || null;
  const badge = eyebrow?.trim() || "Neden En İyisiyiz";
  const highlight = statValue?.trim() || "50k+";
  const highlightLead =
    statDescription?.trim() ||
    "Binlerce saatlik tasarım ve geliştirme deneyimiyle markaların dijital dönüşümüne eşlik ediyoruz.";

  return (
    <section className="relative overflow-hidden py-20">
      <div className="pointer-events-none absolute inset-0 site-soft-glow opacity-60" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex rounded-full bg-site-primary-soft px-3 py-1 text-xs font-semibold tracking-wider text-site-primary uppercase">
            {badge}
          </span>
          <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-site-fg sm:text-4xl">
            {heading}
          </h2>
          {lead ? <p className="mt-3 text-site-muted">{lead}</p> : null}
        </div>

        {showLeftPanel ? (
          <div className="mt-14 grid items-start gap-10 lg:grid-cols-2 lg:gap-14">
            <div>
              <p className="text-6xl font-extrabold tracking-tight text-site-primary sm:text-7xl">
                {highlight}
              </p>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-site-muted">
                {highlightLead}
              </p>

              <div className="mt-8 space-y-2">
                {accordion.map((item, index) => {
                  const open = openIndex === index;
                  const body = stripHtml(item.description) || "Detay yakında.";
                  return (
                    <div
                      key={item.id}
                      className="overflow-hidden rounded-2xl border border-site-border bg-site-card"
                    >
                      <button
                        type="button"
                        onClick={() => setOpenIndex(open ? -1 : index)}
                        className="flex w-full items-center gap-3 px-4 py-4 text-left"
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-site-primary text-xs font-bold text-white">
                          {index + 1}
                        </span>
                        <span className="flex-1 text-sm font-semibold text-site-fg">
                          {item.name}
                        </span>
                        <ChevronDown
                          className={`h-4 w-4 text-site-muted transition ${
                            open ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                      {open ? (
                        <p className="border-t border-site-border px-4 pt-3 pb-4 text-sm leading-relaxed text-site-muted">
                          {body}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="relative">
              {canSlide ? (
                <div className="mb-3 flex justify-end gap-2">
                  <button
                    type="button"
                    aria-label="Önceki projeler"
                    onClick={() => scrollByCard(-1)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-site-border bg-site-card text-site-fg transition hover:border-site-primary/40 hover:text-site-primary"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Sonraki projeler"
                    onClick={() => scrollByCard(1)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-site-border bg-site-card text-site-fg transition hover:border-site-primary/40 hover:text-site-primary"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>
              ) : null}

              <div
                ref={scrollRef}
                className={
                  canSlide
                    ? "max-h-[27.5rem] space-y-4 overflow-y-auto overscroll-contain pr-1 [scrollbar-width:thin] sm:max-h-[30rem]"
                    : "space-y-4"
                }
              >
                {list.map((project) => (
                  <ProjectCard
                    key={project.href + project.title}
                    project={project}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
            {list.map((project) => (
              <ProjectCard
                key={project.href + project.title}
                project={project}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
