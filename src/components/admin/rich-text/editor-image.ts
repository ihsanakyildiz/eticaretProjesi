import Image from "@tiptap/extension-image";

export type EditorImageAlign = "left" | "right" | "center" | "none";

export const EDITOR_IMAGE_WIDTHS = ["25%", "33%", "50%", "66%", "75%", "100%"] as const;
export type EditorImageWidth = (typeof EDITOR_IMAGE_WIDTHS)[number];

function mergeStyle(existing: unknown, next: string) {
  const base = typeof existing === "string" ? existing.replace(/;?\s*$/, "") : "";
  return [base, next].filter(Boolean).join("; ");
}

/**
 * TipTap Image with float alignment + size attributes (MIT).
 * data-align: left | right | center | none
 * data-size: e.g. 50%
 */
export const EditorImage = Image.extend({
  name: "image",

  addAttributes() {
    return {
      ...this.parent?.(),
      // TipTap varsayılan sayısal width'i devre dışı bırak
      width: {
        default: null,
        parseHTML: () => null,
        renderHTML: () => ({}),
      },
      align: {
        default: "none" satisfies EditorImageAlign,
        parseHTML: (element) =>
          (element.getAttribute("data-align") as EditorImageAlign | null) || "none",
        renderHTML: (attributes) => ({
          "data-align": (attributes.align as EditorImageAlign) || "none",
        }),
      },
      size: {
        default: "50%",
        parseHTML: (element) =>
          element.getAttribute("data-size") ||
          element.getAttribute("data-width") ||
          element.style.width ||
          "50%",
        renderHTML: (attributes) => {
          const size = (attributes.size as string) || "50%";
          return {
            "data-size": size,
            style: mergeStyle(attributes.style, `width: ${size}; height: auto`),
          };
        },
      },
    };
  },
}).configure({
  allowBase64: false,
  HTMLAttributes: {
    class: "rich-text-editor__image",
  },
});
