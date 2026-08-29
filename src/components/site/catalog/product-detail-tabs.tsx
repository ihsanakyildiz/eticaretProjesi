"use client";

import { useState } from "react";

export type ProductFeatureRow = {
  id: string;
  name: string;
  value: string;
};

type ProductDetailTab = "description" | "features";

function renderTab(
  tab: ProductDetailTab,
  descriptionHtml: string | null,
  features: ProductFeatureRow[],
) {
  switch (tab) {
    case "description":
      return descriptionHtml ? (
        <div
          className="prose prose-slate max-w-none dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: descriptionHtml }}
        />
      ) : null;
    case "features":
      return (
        <dl className="divide-y divide-site-border rounded-lg border border-site-border">
          {features.map((row) => (
            <div key={row.id} className="grid grid-cols-2 gap-4 px-4 py-3 text-sm">
              <dt className="text-site-muted">{row.name}</dt>
              <dd className="font-medium text-site-fg">{row.value}</dd>
            </div>
          ))}
        </dl>
      );
    default: {
      const _exhaustive: never = tab;
      return _exhaustive;
    }
  }
}

export function ProductDetailTabs({
  descriptionHtml,
  features,
}: {
  descriptionHtml: string | null;
  features: ProductFeatureRow[];
}) {
  const hasDescription = Boolean(descriptionHtml);
  const hasFeatures = features.length > 0;
  if (!hasDescription && !hasFeatures) return null;

  const initial: ProductDetailTab = hasDescription ? "description" : "features";
  const [tab, setTab] = useState<ProductDetailTab>(initial);

  return (
    <div>
      <div className="flex gap-1 border-b border-site-border">
        {hasDescription ? (
          <button
            type="button"
            onClick={() => setTab("description")}
            className={`px-4 py-2.5 text-sm font-medium ${
              tab === "description"
                ? "border-b-2 border-site-primary text-site-fg"
                : "text-site-muted hover:text-site-fg"
            }`}
          >
            Açıklama
          </button>
        ) : null}
        {hasFeatures ? (
          <button
            type="button"
            onClick={() => setTab("features")}
            className={`px-4 py-2.5 text-sm font-medium ${
              tab === "features"
                ? "border-b-2 border-site-primary text-site-fg"
                : "text-site-muted hover:text-site-fg"
            }`}
          >
            Özellikler
          </button>
        ) : null}
      </div>
      <div className="pt-5">{renderTab(tab, descriptionHtml, features)}</div>
    </div>
  );
}
