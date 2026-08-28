"use client";

import { createLowlight, common } from "lowlight";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";

const lowlight = createLowlight(common);

/** TipTap kod bloğu — dil sınıfları + lowlight (admin önizleme) */
export const EditorCodeBlock = CodeBlockLowlight.configure({
  lowlight,
  defaultLanguage: "plaintext",
  HTMLAttributes: {
    class: "rich-text-editor__code-block",
  },
});
