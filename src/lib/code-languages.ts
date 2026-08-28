/** Admin kod bloğu + sitede etiket için desteklenen diller */
export const CODE_LANGUAGE_OPTIONS = [
  { value: "plaintext", label: "Düz metin" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "php", label: "PHP" },
  { value: "python", label: "Python" },
  { value: "json", label: "JSON" },
  { value: "bash", label: "Bash / Shell" },
  { value: "sql", label: "SQL" },
  { value: "java", label: "Java" },
  { value: "csharp", label: "C#" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
  { value: "markdown", label: "Markdown" },
  { value: "xml", label: "XML" },
] as const;

export type CodeLanguageValue = (typeof CODE_LANGUAGE_OPTIONS)[number]["value"];

const LABEL_BY_VALUE = new Map(
  CODE_LANGUAGE_OPTIONS.map((item) => [item.value, item.label] as const),
);

const ALIAS_TO_CANONICAL: Record<string, CodeLanguageValue> = {
  js: "javascript",
  jsx: "javascript",
  ts: "typescript",
  tsx: "typescript",
  htm: "html",
  sh: "bash",
  shell: "bash",
  zsh: "bash",
  py: "python",
  cs: "csharp",
  md: "markdown",
  plain: "plaintext",
  text: "plaintext",
  txt: "plaintext",
};

export function normalizeCodeLanguage(raw: string | null | undefined): CodeLanguageValue {
  const key = (raw || "").trim().toLowerCase();
  if (!key) return "plaintext";
  if (LABEL_BY_VALUE.has(key as CodeLanguageValue)) {
    return key as CodeLanguageValue;
  }
  return ALIAS_TO_CANONICAL[key] ?? "plaintext";
}

export function codeLanguageLabel(raw: string | null | undefined): string {
  const lang = normalizeCodeLanguage(raw);
  return LABEL_BY_VALUE.get(lang) ?? lang;
}
