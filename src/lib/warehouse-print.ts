const LABEL_PRINT_STYLES = `
  @page { size: 100mm 150mm; margin: 0; }
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    width: 100mm;
    height: 150mm;
    background: #fff !important;
    color: #111 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .warehouse-cargo-label {
    box-sizing: border-box;
    width: 100mm;
    min-height: 150mm;
    max-width: none;
    margin: 0;
    padding: 6mm;
    border: 0;
    border-radius: 0;
    box-shadow: none;
    background: #fff;
    color: #111;
    font-family: Arial, Helvetica, sans-serif;
  }
  .warehouse-cargo-label svg {
    max-width: 88mm;
    height: auto;
  }
  .warehouse-cargo-label svg rect {
    fill: #000;
  }
`;

export function printWarehouseCargoLabel(element: HTMLElement | null) {
  if (!element || typeof window === "undefined") return;

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "100mm";
  iframe.style.height = "150mm";
  iframe.style.border = "0";
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";
  iframe.style.zIndex = "-1";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    iframe.remove();
    return;
  }

  const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map((node) => node.outerHTML)
    .join("");

  doc.open();
  doc.write(`<!doctype html><html><head><title>Kargo etiketi</title>${styles}<style>${LABEL_PRINT_STYLES}</style></head><body>${element.outerHTML}</body></html>`);
  doc.close();

  const cleanup = () => {
    window.setTimeout(() => iframe.remove(), 400);
  };
  win.addEventListener("afterprint", cleanup);
  window.setTimeout(cleanup, 5 * 60_000);

  const trigger = () => {
    win.focus();
    win.print();
  };

  if (doc.readyState === "complete") {
    window.setTimeout(trigger, 50);
    return;
  }
  iframe.addEventListener("load", () => window.setTimeout(trigger, 50), { once: true });
}
