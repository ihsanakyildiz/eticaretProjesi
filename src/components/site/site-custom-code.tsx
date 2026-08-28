"use client";

import { useEffect } from "react";

type SiteCustomCodeProps = {
  headCode?: string;
  bodyCode?: string;
};

function injectHtml(
  html: string,
  target: "head" | "body",
  options?: { scriptsOnly?: boolean },
): () => void {
  const trimmed = html.trim();
  if (!trimmed) return () => undefined;

  const template = document.createElement("template");
  template.innerHTML = trimmed;

  const parent = target === "head" ? document.head : document.body;
  const appended: Node[] = [];
  const scriptsOnly = options?.scriptsOnly === true;

  Array.from(template.content.childNodes).forEach((node) => {
    if (node.nodeName === "SCRIPT") {
      const source = node as HTMLScriptElement;
      const script = document.createElement("script");
      Array.from(source.attributes).forEach((attr) => {
        script.setAttribute(attr.name, attr.value);
      });
      script.text = source.text;
      parent.appendChild(script);
      appended.push(script);
      return;
    }

    if (scriptsOnly) return;

    if (node.nodeType === Node.TEXT_NODE && !node.textContent?.trim()) return;

    const clone = node.cloneNode(true);
    parent.appendChild(clone);
    appended.push(clone);
  });

  return () => {
    appended.forEach((node) => {
      node.parentNode?.removeChild(node);
    });
  };
}

/**
 * Admin panelinden girilen özel HTML/script kodunu public sitede enjekte eder.
 * Head içindeki meta/link/style sunucuda SiteCustomHeadTags ile eklenir;
 * burada head için yalnızca script’ler, body için tüm içerik işlenir.
 */
export function SiteCustomCode({ headCode, bodyCode }: SiteCustomCodeProps) {
  useEffect(() => {
    const cleanups: Array<() => void> = [];
    if (headCode) cleanups.push(injectHtml(headCode, "head", { scriptsOnly: true }));
    if (bodyCode) cleanups.push(injectHtml(bodyCode, "body"));
    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [headCode, bodyCode]);

  return null;
}
