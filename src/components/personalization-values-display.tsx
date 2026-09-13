import type { CartPersonalization } from "@/lib/product-personalization";
import {
  personalizationOpenUrl,
  personalizationPreviewUrl,
} from "@/lib/product-personalization";

export function PersonalizationValuesDisplay({
  personalization,
  className = "",
}: {
  personalization?: CartPersonalization | null;
  className?: string;
}) {
  if (!personalization?.values.length) return null;

  return (
    <ul className={`space-y-1.5 text-xs ${className}`.trim()}>
      {personalization.values.map((item) => {
        switch (item.kind) {
          case "TEXT":
            return (
              <li key={item.fieldId}>
                <span className="font-medium opacity-90">{item.label}:</span>{" "}
                <span className="break-words">{item.textValue}</span>
              </li>
            );
          case "IMAGE": {
            const preview = personalizationPreviewUrl(item);
            const openUrl = personalizationOpenUrl(item);
            return (
              <li key={item.fieldId} className="flex flex-wrap items-center gap-2">
                <span className="font-medium opacity-90">{item.label}:</span>
                {preview ? (
                  <a
                    href={openUrl || preview}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 hover:opacity-90"
                    title={item.originalPurged ? "Önizleme" : "Görseli aç"}
                  >
                    <img
                      src={preview}
                      alt={item.label}
                      className="h-12 w-12 rounded border border-black/10 object-cover"
                    />
                    <span className="underline underline-offset-2">
                      {item.originalPurged ? "Önizleme" : "Görseli aç"}
                    </span>
                  </a>
                ) : (
                  <span>görsel yok</span>
                )}
              </li>
            );
          }
          default: {
            const _exhaustive: never = item.kind;
            return _exhaustive;
          }
        }
      })}
    </ul>
  );
}
