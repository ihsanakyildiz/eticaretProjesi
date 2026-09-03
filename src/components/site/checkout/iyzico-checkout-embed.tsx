"use client";

import { useEffect, useRef } from "react";

type IyzicoWindow = Window & { iyziInit?: unknown };

function resetIyzicoGlobals() {
  const view = window as IyzicoWindow;
  try {
    view.iyziInit = undefined;
  } catch {
    /* iyzico defines iyziInit with var; it cannot be deleted */
  }
  document.querySelectorAll('script[src*="iyzipay.com/checkoutform"]').forEach((node) => node.remove());
}

function loadScripts(html: string): HTMLScriptElement[] {
  const parsed = new DOMParser().parseFromString(html, "text/html");
  const nodes = [...parsed.querySelectorAll("script")];
  const created: HTMLScriptElement[] = [];

  const sources =
    nodes.length > 0
      ? nodes
      : html.trim()
        ? [
            (() => {
              const fallback = parsed.createElement("script");
              fallback.type = "text/javascript";
              fallback.textContent = html;
              return fallback;
            })(),
          ]
        : [];

  for (const source of sources) {
    const script = document.createElement("script");
    for (const attr of source.attributes) {
      script.setAttribute(attr.name, attr.value);
    }
    if (source.src) {
      script.async = false;
    } else {
      script.textContent = source.textContent ?? "";
    }
    created.push(script);
  }
  return created;
}

export function IyzicoCheckoutEmbed({ html }: { html: string }) {
  const injectedRef = useRef<HTMLScriptElement[]>([]);

  useEffect(() => {
    resetIyzicoGlobals();
    const scripts = loadScripts(html);
    injectedRef.current = scripts;
    for (const script of scripts) {
      document.body.appendChild(script);
    }

    return () => {
      for (const script of injectedRef.current) {
        script.remove();
      }
      injectedRef.current = [];
      resetIyzicoGlobals();
      const slot = document.getElementById("iyzipay-checkout-form");
      slot?.replaceChildren();
    };
  }, [html]);

  return (
    <div className="overflow-hidden rounded-lg border border-site-border bg-white p-2 sm:p-4">
      <style>{`
        #iyzipay-checkout-form { min-height: 520px; width: 100%; }
        #iyzipay-checkout-form iframe { width: 100% !important; min-height: 520px; border: 0; }
      `}</style>
      <div id="iyzipay-checkout-form" className="responsive" />
    </div>
  );
}
