import { ExternalLink, Package, Truck } from "lucide-react";
import { formatOrderDateTime } from "@/lib/orders";
import type { MemberShipmentTracking } from "@/lib/shipment-tracking";

function portalCopy(provider: "YURTICI" | "ARAS") {
  switch (provider) {
    case "YURTICI":
      return {
        empty: "Yurtiçi Kargo paketi teslim aldığında aşamalar burada listelenir.",
        open: "Yurtiçi Kargo’da aç",
      };
    case "ARAS":
      return {
        empty: "Aras Kargo paketi teslim aldığında aşamalar burada listelenir.",
        open: "Aras Kargo’da aç",
      };
    default: {
      const _exhaustive: never = provider;
      return _exhaustive;
    }
  }
}

export function MemberShipmentTracking({ tracking }: { tracking: MemberShipmentTracking }) {
  switch (tracking.kind) {
    case "link":
      return (
        <section className="rounded-2xl border border-site-border bg-site-card p-5 sm:p-6">
          <h3 className="text-base font-semibold text-site-fg">Kargo takibi</h3>
          <p className="mt-2 text-sm text-site-muted">
            {tracking.carrierName} · {tracking.cargoKey}
          </p>
          <a
            href={tracking.publicUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-site-primary hover:underline"
          >
            Kargo hareketlerini gör
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </section>
      );
    case "timeline": {
      const { tracking: view, cargoKey, carrierName, publicUrl, provider } = tracking;
      const copy = portalCopy(provider);
      return (
        <section className="rounded-2xl border border-site-border bg-site-card p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-site-fg">Kargo takibi</h3>
              <p className="mt-1 text-sm text-site-muted">
                {carrierName}
                {view.docId ? ` · ${view.docId}` : ` · ${cargoKey}`}
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-800">
              <Truck className="h-3.5 w-3.5" />
              {view.statusLabel}
            </span>
          </div>

          {view.events.length === 0 ? (
            <div className="mt-4 flex gap-3 rounded-xl border border-dashed border-site-border bg-site-surface px-4 py-3 text-sm text-site-muted">
              <Package className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{view.message || copy.empty}</p>
            </div>
          ) : (
            <ol className="mt-5 space-y-0">
              {view.events.map((event, index) => {
                const last = index === view.events.length - 1;
                return (
                  <li key={`${event.at}-${event.title}-${index}`} className="flex gap-3">
                    <div className="flex w-4 flex-col items-center">
                      <span
                        className={`mt-1 h-2.5 w-2.5 rounded-full ${
                          last ? "bg-site-primary" : "bg-site-border"
                        }`}
                      />
                      {last ? null : <span className="min-h-8 w-px flex-1 bg-site-border" />}
                    </div>
                    <div className={`min-w-0 pb-4 ${last ? "pb-0" : ""}`}>
                      <p className="text-sm font-medium text-site-fg">{event.title}</p>
                      {event.reason && event.reason !== event.title ? (
                        <p className="mt-0.5 text-xs text-site-muted">{event.reason}</p>
                      ) : null}
                      {event.location ? (
                        <p className="mt-0.5 text-xs text-site-muted">{event.location}</p>
                      ) : null}
                      {event.at ? (
                        <p className="mt-1 text-xs text-site-muted">{formatOrderDateTime(event.at)}</p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}

          {publicUrl ? (
            <a
              href={publicUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-site-primary hover:underline"
            >
              {copy.open}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : null}
        </section>
      );
    }
    default: {
      const _exhaustive: never = tracking;
      return _exhaustive;
    }
  }
}
