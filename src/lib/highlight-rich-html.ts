import hljs from "highlight.js/lib/core";
import bash from "highlight.js/lib/languages/bash";
import csharp from "highlight.js/lib/languages/csharp";
import css from "highlight.js/lib/languages/css";
import go from "highlight.js/lib/languages/go";
import java from "highlight.js/lib/languages/java";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import markdown from "highlight.js/lib/languages/markdown";
import php from "highlight.js/lib/languages/php";
import plaintext from "highlight.js/lib/languages/plaintext";
import python from "highlight.js/lib/languages/python";
import rust from "highlight.js/lib/languages/rust";
import sql from "highlight.js/lib/languages/sql";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import {
  codeLanguageLabel,
  normalizeCodeLanguage,
  type CodeLanguageValue,
} from "@/lib/code-languages";

let registered = false;

function ensureHighlightLanguages() {
  if (registered) return;
  hljs.registerLanguage("bash", bash);
  hljs.registerLanguage("csharp", csharp);
  hljs.registerLanguage("css", css);
  hljs.registerLanguage("go", go);
  hljs.registerLanguage("html", xml);
  hljs.registerLanguage("java", java);
  hljs.registerLanguage("javascript", javascript);
  hljs.registerLanguage("json", json);
  hljs.registerLanguage("markdown", markdown);
  hljs.registerLanguage("php", php);
  hljs.registerLanguage("plaintext", plaintext);
  hljs.registerLanguage("python", python);
  hljs.registerLanguage("rust", rust);
  hljs.registerLanguage("sql", sql);
  hljs.registerLanguage("typescript", typescript);
  hljs.registerLanguage("xml", xml);
  registered = true;
}

function decodeBasicEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&amp;/gi, "&");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function languageFromCodeAttrs(attrs: string): CodeLanguageValue {
  const classMatch = attrs.match(/\blanguage-([a-z0-9_+-]+)\b/i);
  if (classMatch?.[1]) return normalizeCodeLanguage(classMatch[1]);

  const dataMatch = attrs.match(/\bdata-language\s*=\s*["']([^"']+)["']/i);
  if (dataMatch?.[1]) return normalizeCodeLanguage(dataMatch[1]);

  return "plaintext";
}

function highlightCode(code: string, language: CodeLanguageValue) {
  ensureHighlightLanguages();
  const source = decodeBasicEntities(code).replace(/\n$/, "");
  try {
    if (language === "plaintext" || !hljs.getLanguage(language)) {
      return escapeHtml(source);
    }
    return hljs.highlight(source, { language, ignoreIllegals: true }).value;
  } catch {
    return escapeHtml(source);
  }
}

/**
 * TipTap `<pre><code class="language-…">` bloklarını editör benzeri
 * sözdizimi vurgulu HTML’e çevirir.
 */
export function highlightRichCodeBlocks(html: string): string {
  if (!html || !/<pre\b/i.test(html)) return html;

  return html.replace(
    /<pre\b([^>]*)>\s*<code\b([^>]*)>([\s\S]*?)<\/code>\s*<\/pre>/gi,
    (_match, _preAttrs: string, codeAttrs: string, rawCode: string) => {
      if (/site-code-block__code/i.test(codeAttrs)) {
        return _match;
      }

      const language = languageFromCodeAttrs(codeAttrs);
      const label = codeLanguageLabel(language);
      const highlighted = highlightCode(rawCode, language);

      return [
        `<div class="site-code-block" data-language="${escapeHtml(language)}">`,
        `<div class="site-code-block__header" aria-hidden="true">`,
        `<span class="site-code-block__dots"><i></i><i></i><i></i></span>`,
        `<span class="site-code-block__lang">${escapeHtml(label)}</span>`,
        `</div>`,
        `<pre class="site-code-block__pre"><code class="site-code-block__code language-${escapeHtml(language)} hljs">${highlighted}</code></pre>`,
        `</div>`,
      ].join("");
    },
  );
}
