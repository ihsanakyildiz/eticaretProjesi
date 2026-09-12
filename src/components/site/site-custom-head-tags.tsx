import { extractStaticHeadTags, hasCustomCode } from "@/lib/custom-code";
import { isWastedFirstPaintHint } from "@/lib/resource-hints";

type SiteCustomHeadTagsProps = {
  code?: string;
};

/**
 * Admin’den girilen </head> kodundaki meta/link/style etiketlerini
 * sunucu tarafında ilk HTML’e ekler (doğrulama kodları için kritik).
 * Script’ler SiteCustomCode ile istemci tarafında enjekte edilir.
 */
export function SiteCustomHeadTags({ code }: SiteCustomHeadTagsProps) {
  if (!hasCustomCode(code)) return null;

  const tags = extractStaticHeadTags(code!);

  return (
    <>
      {tags.map((tag, index) => {
        if (tag.type === "meta") {
          return <meta key={`custom-meta-${index}`} {...tag.attrs} />;
        }
        if (tag.type === "link") {
          const rel = tag.attrs.rel?.toLowerCase() ?? "";
          const href = tag.attrs.href ?? "";
          if (
            (rel === "preconnect" || rel === "dns-prefetch") &&
            isWastedFirstPaintHint(href)
          ) {
            return null;
          }
          return <link key={`custom-link-${index}`} {...tag.attrs} />;
        }
        return (
          <style
            key={`custom-style-${index}`}
            {...tag.attrs}
            dangerouslySetInnerHTML={{ __html: tag.css }}
          />
        );
      })}
    </>
  );
}
