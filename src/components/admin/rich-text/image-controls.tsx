"use client";

import { useEditorState, type Editor } from "@tiptap/react";
import type { ReactNode } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Crop,
  Maximize2,
  Trash2,
} from "lucide-react";
import {
  EDITOR_IMAGE_WIDTHS,
  type EditorImageAlign,
  type EditorImageWidth,
} from "./editor-image";

type ImageControlsProps = {
  editor: Editor;
  onCrop: () => void;
};

function ControlButton({
  title,
  active,
  onClick,
  children,
}: {
  title: string;
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={`inline-flex h-8 items-center justify-center gap-1 rounded-md border px-2 text-xs font-medium transition ${
        active
          ? "border-[#0ab39c]/40 bg-[#0ab39c]/10 text-[#0ab39c]"
          : "border-[#e9ebec] bg-white text-slate-600 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

export function ImageControls({ editor, onCrop }: ImageControlsProps) {
  const state = useEditorState({
    editor,
    selector: (ctx) => {
      const active = ctx.editor.isActive("image");
      if (!active) {
        return { active: false as const, align: "none" as EditorImageAlign, size: "50%", src: "" };
      }
      const attrs = ctx.editor.getAttributes("image");
      return {
        active: true as const,
        align: (attrs.align as EditorImageAlign) || "none",
        size: (attrs.size as string) || "50%",
        src: (attrs.src as string) || "",
      };
    },
  });

  if (!state.active) return null;

  const setAlign = (align: EditorImageAlign) => {
    const nextSize =
      align === "left" || align === "right"
        ? state.size === "100%"
          ? "50%"
          : state.size
        : state.size;

    editor
      .chain()
      .focus()
      .updateAttributes("image", { align, size: nextSize })
      .run();
  };

  const setSize = (size: EditorImageWidth) => {
    editor.chain().focus().updateAttributes("image", { size }).run();
  };

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-[#e9ebec] bg-[#eef2f7] px-3 py-2">
      <span className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
        Görsel
      </span>

      <span className="h-5 w-px bg-[#d7dde5]" />

      <div className="flex flex-wrap items-center gap-1">
        <ControlButton
          title="Sola yasla (metin sağda akar)"
          active={state.align === "left"}
          onClick={() => setAlign("left")}
        >
          <AlignLeft className="h-3.5 w-3.5" />
          Sol
        </ControlButton>
        <ControlButton
          title="Sağa yasla (metin solda akar)"
          active={state.align === "right"}
          onClick={() => setAlign("right")}
        >
          <AlignRight className="h-3.5 w-3.5" />
          Sağ
        </ControlButton>
        <ControlButton
          title="Ortala"
          active={state.align === "center"}
          onClick={() => setAlign("center")}
        >
          <AlignCenter className="h-3.5 w-3.5" />
          Orta
        </ControlButton>
        <ControlButton
          title="Blok / tam genişlik"
          active={state.align === "none"}
          onClick={() => setAlign("none")}
        >
          <Maximize2 className="h-3.5 w-3.5" />
          Blok
        </ControlButton>
      </div>

      <span className="h-5 w-px bg-[#d7dde5]" />

      <label className="flex items-center gap-1.5 text-xs text-slate-600">
        <span className="font-medium">Boyut</span>
        <select
          value={EDITOR_IMAGE_WIDTHS.includes(state.size as EditorImageWidth) ? state.size : "50%"}
          onMouseDown={(event) => event.stopPropagation()}
          onChange={(event) => setSize(event.target.value as EditorImageWidth)}
          className="rounded-md border border-[#e9ebec] bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-[#0ab39c]"
        >
          {EDITOR_IMAGE_WIDTHS.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </label>

      <span className="h-5 w-px bg-[#d7dde5]" />

      <ControlButton title="Görseli kırp" onClick={onCrop}>
        <Crop className="h-3.5 w-3.5" />
        Kırp
      </ControlButton>

      <ControlButton
        title="Görseli sil"
        onClick={() => editor.chain().focus().deleteSelection().run()}
      >
        <Trash2 className="h-3.5 w-3.5 text-rose-500" />
        Sil
      </ControlButton>
    </div>
  );
}
