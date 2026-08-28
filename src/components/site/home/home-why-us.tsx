import { SiteImage } from "@/components/site/site-image";
import { SiteLink } from "@/components/site/site-link";
import type { CardLayout } from "@prisma/client";
import { CheckCircle2, Play } from "lucide-react";
import { parseCardFeatures } from "@/lib/cards";

export type AdvancedCardData = {
  title: string;
  badgeText?: string | null;
  subtitle?: string | null;
  description?: string | null;
  features?: string | null;
  layout?: CardLayout | null;
  image?: string | null;
  showFrame?: boolean | null;
  showSparkles?: boolean | null;
  videoLabel?: string | null;
  videoUrl?: string | null;
  profileName?: string | null;
  profileRole?: string | null;
  profileImage?: string | null;
  statValue?: string | null;
  statLabel?: string | null;
};

const FALLBACK: AdvancedCardData = {
  title: "Büyük ve küçük organizasyonlara çözüm üretiyoruz",
  badgeText: "Neden Biz",
  subtitle: "Dijital hayallerinizi gerçeğe dönüştürüyoruz",
  description:
    "<p>Ekibinize üst düzey mentoring, ürün odaklı tasarım ve sürdürülebilir yazılım çözümleri sunuyoruz.</p>",
  features: JSON.stringify([
    "BT danışmanlığı için ideal",
    "Yenilikçi yaklaşımlar",
    "Zaman ve maliyet tasarrufu",
    "%100 memnuniyet odaklı",
  ]),
  layout: "MEDIA_LEFT",
  image:
    "https://images.unsplash.com/photo-1600880292089-90a7e086ee0c?auto=format&fit=crop&w=900&q=80",
  showFrame: true,
  showSparkles: true,
  videoLabel: "Video Rehber",
  videoUrl: null,
  profileName: "İhsan Akyıldız",
  profileRole: "Kurucu & Direktör",
  profileImage:
    "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=160&q=80",
  statValue: "+12",
  statLabel: "Yıllık deneyim",
};

function MediaBlock({ card }: { card: AdvancedCardData }) {
  const imageSrc =
    card.image ||
    "https://images.unsplash.com/photo-1600880292089-90a7e086ee0c?auto=format&fit=crop&w=900&q=80";
  const showFrame = card.showFrame !== false;
  const showSparkles = card.showSparkles !== false;
  const videoLabel = card.videoLabel?.trim();
  const videoUrl = card.videoUrl?.trim();

  const overlay =
    videoLabel ? (
      videoUrl ? (
        <SiteLink
          href={videoUrl}
          className="absolute bottom-5 left-1/2 inline-flex -translate-x-1/2 items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-lg transition hover:scale-[1.02]"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-site-primary text-white">
            <Play className="h-3.5 w-3.5 fill-current" />
          </span>
          {videoLabel}
        </SiteLink>
      ) : (
        <span className="absolute bottom-5 left-1/2 inline-flex -translate-x-1/2 items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-lg">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-site-primary text-white">
            <Play className="h-3.5 w-3.5 fill-current" />
          </span>
          {videoLabel}
        </span>
      )
    ) : null;

  return (
    <div className="relative mx-auto w-full max-w-md">
      {showFrame ? (
        <div className="absolute -inset-3 rounded-[2rem] border-[10px] border-site-primary/25" />
      ) : null}
      <div className="relative overflow-hidden rounded-[1.6rem] shadow-2xl">
        <SiteImage
          src={imageSrc}
          alt={card.subtitle || card.title}
          width={720}
          height={900}
          className="aspect-[4/5] w-full object-cover"
          sizes="(max-width: 1024px) 90vw, 448px"
        />
        {overlay}
      </div>
      {showSparkles ? (
        <>
          <span className="absolute -top-2 -right-1 text-2xl text-white drop-shadow">
            ✦
          </span>
          <span className="absolute -bottom-1 -left-1 text-2xl text-white drop-shadow">
            ✦
          </span>
        </>
      ) : null}
    </div>
  );
}

function ContentBlock({ card }: { card: AdvancedCardData }) {
  const features = parseCardFeatures(card.features);
  const hasProfile = Boolean(card.profileName || card.profileImage);
  const hasStat = Boolean(card.statValue || card.statLabel);

  return (
    <div>
      {card.subtitle ? (
        <h3 className="font-display text-2xl font-bold text-site-fg sm:text-3xl">
          {card.subtitle}
        </h3>
      ) : null}

      {card.description ? (
        <div
          className="site-rich-content mt-4"
          dangerouslySetInnerHTML={{ __html: card.description }}
        />
      ) : null}

      {features.length > 0 ? (
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {features.map((feature) => (
            <div
              key={feature}
              className="flex items-start gap-2.5 text-sm font-medium text-site-fg"
            >
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-site-primary" />
              {feature}
            </div>
          ))}
        </div>
      ) : null}

      {hasProfile || hasStat ? (
        <div className="mt-10 flex flex-wrap items-center gap-6 border-t border-site-border pt-8">
          {hasProfile ? (
            <div className="flex items-center gap-3">
              {card.profileImage ? (
                <span className="relative h-14 w-14 overflow-hidden rounded-full border-2 border-site-primary/30">
                  <SiteImage
                    src={card.profileImage}
                    alt={card.profileName || "Profil"}
                    fill
                    className="object-cover"
                    sizes="56px"
                  />
                </span>
              ) : null}
              <div>
                {card.profileName ? (
                  <p className="font-display text-lg font-semibold text-site-fg">
                    {card.profileName}
                  </p>
                ) : null}
                {card.profileRole ? (
                  <p className="text-xs text-site-muted">{card.profileRole}</p>
                ) : null}
              </div>
            </div>
          ) : null}
          {hasProfile && hasStat ? (
            <div className="h-10 w-px bg-site-border" />
          ) : null}
          {hasStat ? (
            <div>
              {card.statValue ? (
                <p className="text-3xl font-extrabold text-site-primary">
                  {card.statValue}
                </p>
              ) : null}
              {card.statLabel ? (
                <p className="text-xs font-medium text-site-muted">
                  {card.statLabel}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function HomeWhyUs({ card }: { card?: AdvancedCardData | null }) {
  const data = card ?? FALLBACK;
  const layout = data.layout ?? "MEDIA_LEFT";

  const media = <MediaBlock card={data} />;
  const content = <ContentBlock card={data} />;

  const isStacked = layout === "MEDIA_TOP" || layout === "MEDIA_BOTTOM";
  const mediaFirst =
    layout === "MEDIA_LEFT" || layout === "MEDIA_TOP";

  return (
    <section className="relative overflow-hidden bg-site-surface py-20">
      <div className="pointer-events-none absolute inset-0 site-soft-glow opacity-70" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          {data.badgeText ? (
            <span className="inline-flex rounded-full bg-site-primary-soft px-3 py-1 text-xs font-semibold tracking-wider text-site-primary uppercase">
              ••• {data.badgeText}
            </span>
          ) : null}
          <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-site-fg sm:text-4xl">
            {data.title}
          </h2>
        </div>

        <div
          className={
            isStacked
              ? "mt-14 mx-auto flex max-w-3xl flex-col gap-10"
              : "mt-14 grid items-center gap-10 lg:grid-cols-2 lg:gap-14"
          }
        >
          {mediaFirst ? (
            <>
              {media}
              {content}
            </>
          ) : (
            <>
              {content}
              {media}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
