"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import {
  Bold,
  Code2,
  FileCode2,
  Heading2,
  Heading3,
  ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Quote,
  Redo2,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo2,
  Unlink,
} from "lucide-react";
import { EditorCodeBlock } from "@/components/admin/rich-text/editor-code-block";
import { EditorImage } from "@/components/admin/rich-text/editor-image";
import { ImageControls } from "@/components/admin/rich-text/image-controls";
import { ImageCropModal } from "@/components/admin/rich-text/image-crop-modal";
import {
  CODE_LANGUAGE_OPTIONS,
  normalizeCodeLanguage,
} from "@/lib/code-languages";

type RichTextEditorProps = {
  id?: string;
  name: string;
  value?: string;
  placeholder?: string;
  /** compact: kısa özet için daha düşük yükseklik ve sade araç çubuğu */
  variant?: "compact" | "full";
  onChange?: (html: string) => void;
};

function normalizeStoredHtml(html: string) {
  if (/<img\b/i.test(html)) return html;

  const text = html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text ? html : "";
}

async function uploadEditorImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.set("file", file);

  const response = await fetch("/api/admin/uploads/editor-image", {
    method: "POST",
    body: formData,
  });

  const payload = (await response.json().catch(() => null)) as {
    url?: string;
    error?: string;
  } | null;

  if (!response.ok || !payload?.url) {
    throw new Error(payload?.error || "Görsel yüklenemedi.");
  }

  return payload.url;
}

const EDITOR_UPLOAD_PREFIX = "/uploads/editor/";

function normalizeEditorUploadSrc(src: unknown): string | null {
  if (typeof src !== "string") return null;
  const raw = src.trim();
  if (!raw) return null;

  try {
    if (raw.startsWith("http://") || raw.startsWith("https://")) {
      const url = new URL(raw);
      return url.pathname.startsWith(EDITOR_UPLOAD_PREFIX) ? url.pathname : null;
    }
  } catch {
    return null;
  }

  const path = raw.split("?")[0].split("#")[0];
  if (!path.startsWith(EDITOR_UPLOAD_PREFIX) || path.includes("..")) {
    return null;
  }
  return path;
}

function countEditorUploadSrcs(editor: Editor): Map<string, number> {
  const counts = new Map<string, number>();
  editor.state.doc.descendants((node) => {
    if (node.type.name !== "image") return;
    const src = normalizeEditorUploadSrc(node.attrs.src);
    if (!src) return;
    counts.set(src, (counts.get(src) ?? 0) + 1);
  });
  return counts;
}

async function deleteEditorImageFromServer(url: string) {
  try {
    await fetch("/api/admin/uploads/editor-image", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
  } catch (error) {
    console.error("Editor image delete failed:", error);
  }
}

function purgeRemovedEditorImages(
  previous: Map<string, number>,
  next: Map<string, number>,
) {
  for (const [src, prevCount] of previous) {
    if (prevCount <= 0) continue;
    if ((next.get(src) ?? 0) > 0) continue;
    void deleteEditorImageFromServer(src);
  }
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-md border text-slate-600 transition disabled:opacity-40 ${
        active
          ? "border-[#0ab39c]/40 bg-[#0ab39c]/10 text-[#0ab39c]"
          : "border-transparent hover:border-[#e9ebec] hover:bg-white hover:text-slate-800"
      }`}
    >
      {children}
    </button>
  );
}

function EditorToolbar({
  editor,
  variant,
  uploading,
  onPickImage,
}: {
  editor: Editor;
  variant: "compact" | "full";
  uploading: boolean;
  onPickImage: () => void;
}) {
  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      canUndo: current.can().undo(),
      canRedo: current.can().redo(),
      bold: current.isActive("bold"),
      italic: current.isActive("italic"),
      underline: current.isActive("underline"),
      strike: current.isActive("strike"),
      heading2: current.isActive("heading", { level: 2 }),
      heading3: current.isActive("heading", { level: 3 }),
      bulletList: current.isActive("bulletList"),
      orderedList: current.isActive("orderedList"),
      blockquote: current.isActive("blockquote"),
      code: current.isActive("code"),
      codeBlock: current.isActive("codeBlock"),
      codeLanguage: normalizeCodeLanguage(
        String(current.getAttributes("codeBlock").language || "plaintext"),
      ),
      link: current.isActive("link"),
      image: current.isActive("image"),
    }),
  });

  const setLink = () => {
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Bağlantı URL’si", previous ?? "https://");
    if (url === null) return;
    const trimmed = url.trim();
    if (!trimmed) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: trimmed }).run();
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-[#e9ebec] bg-[#f3f6f9] px-2 py-1.5">
      <ToolbarButton
        title="Geri al"
        disabled={!state.canUndo}
        onClick={() => editor.chain().focus().undo().run()}
      >
        <Undo2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        title="İleri al"
        disabled={!state.canRedo}
        onClick={() => editor.chain().focus().redo().run()}
      >
        <Redo2 className="h-4 w-4" />
      </ToolbarButton>

      <span className="mx-1 h-5 w-px bg-[#e9ebec]" />

      <ToolbarButton
        title="Kalın"
        active={state.bold}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        title="İtalik"
        active={state.italic}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Altı çizili"
        active={state.underline}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <UnderlineIcon className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Üstü çizili"
        active={state.strike}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough className="h-4 w-4" />
      </ToolbarButton>

      {variant === "full" ? (
        <>
          <span className="mx-1 h-5 w-px bg-[#e9ebec]" />
          <ToolbarButton
            title="Başlık 2"
            active={state.heading2}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          >
            <Heading2 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            title="Başlık 3"
            active={state.heading3}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          >
            <Heading3 className="h-4 w-4" />
          </ToolbarButton>
        </>
      ) : null}

      <span className="mx-1 h-5 w-px bg-[#e9ebec]" />

      <ToolbarButton
        title="Madde listesi"
        active={state.bulletList}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Numaralı liste"
        active={state.orderedList}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="h-4 w-4" />
      </ToolbarButton>

      {variant === "full" ? (
        <ToolbarButton
          title="Alıntı"
          active={state.blockquote}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="h-4 w-4" />
        </ToolbarButton>
      ) : null}

      <span className="mx-1 h-5 w-px bg-[#e9ebec]" />

      <ToolbarButton
        title="Satır içi kod"
        active={state.code}
        onClick={() => editor.chain().focus().toggleCode().run()}
      >
        <Code2 className="h-4 w-4" />
      </ToolbarButton>

      {variant === "full" ? (
        <>
          <ToolbarButton
            title="Kod bloğu"
            active={state.codeBlock}
            onClick={() =>
              editor
                .chain()
                .focus()
                .toggleCodeBlock({ language: "javascript" })
                .run()
            }
          >
            <FileCode2 className="h-4 w-4" />
          </ToolbarButton>
          {state.codeBlock ? (
            <label className="ml-1 inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
              <span className="sr-only">Kod dili</span>
              <select
                className="h-8 max-w-[9.5rem] rounded-md border border-[#e9ebec] bg-white px-1.5 text-xs text-slate-700 outline-none focus:border-[#0ab39c]"
                value={state.codeLanguage}
                onMouseDown={(event) => event.preventDefault()}
                onChange={(event) => {
                  editor
                    .chain()
                    .focus()
                    .updateAttributes("codeBlock", {
                      language: event.target.value,
                    })
                    .run();
                }}
              >
                {CODE_LANGUAGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </>
      ) : null}

      <span className="mx-1 h-5 w-px bg-[#e9ebec]" />

      <ToolbarButton title="Bağlantı ekle" active={state.link} onClick={setLink}>
        <Link2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Bağlantıyı kaldır"
        disabled={!state.link}
        onClick={() => editor.chain().focus().unsetLink().run()}
      >
        <Unlink className="h-4 w-4" />
      </ToolbarButton>

      <span className="mx-1 h-5 w-px bg-[#e9ebec]" />

      <ToolbarButton
        title="Görsel yükle"
        active={state.image}
        disabled={uploading}
        onClick={onPickImage}
      >
        {uploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ImageIcon className="h-4 w-4" />
        )}
      </ToolbarButton>
    </div>
  );
}

export function RichTextEditor({
  id,
  name,
  value = "",
  placeholder = "İçerik yazın…",
  variant = "full",
  onChange,
}: RichTextEditorProps) {
  const initialHtml = useMemo(() => value || "", [value]);
  const [htmlValue, setHtmlValue] = useState(() => normalizeStoredHtml(initialHtml));
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState("");
  const [cropSaving, setCropSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<Editor | null>(null);
  const uploadingRef = useRef(false);
  const imageSrcCountsRef = useRef<Map<string, number>>(new Map());
  const onChangeRef = useRef(onChange);
  const insertImageRef = useRef<(file: File) => Promise<void>>(async () => undefined);

  onChangeRef.current = onChange;

  insertImageRef.current = async (file: File) => {
    if (uploadingRef.current) return;
    if (!file.type.startsWith("image/")) {
      setUploadError("Yalnızca görsel dosyaları yüklenebilir.");
      return;
    }

    uploadingRef.current = true;
    setUploading(true);
    setUploadError(null);

    try {
      const url = await uploadEditorImage(file);
      const current = editorRef.current;
      if (!current) return;
      current
        .chain()
        .focus()
        .insertContent({
          type: "image",
          attrs: {
            src: url,
            alt: file.name.replace(/\.[^.]+$/, ""),
            align: "left",
            size: "50%",
          },
        })
        .run();
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Görsel yüklenemedi.");
    } finally {
      uploadingRef.current = false;
      setUploading(false);
    }
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: variant === "compact" ? false : { levels: [2, 3] },
        blockquote: variant === "compact" ? false : undefined,
        codeBlock: false,
        horizontalRule: false,
        // TipTap 3 StarterKit bunları içerir; ayrı extension ile çift kayıt olmasın
        link: false,
        underline: false,
      }),
      ...(variant === "full" ? [EditorCodeBlock] : []),
      Underline,
      EditorImage,
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: {
          class: "text-[#405189] underline underline-offset-2",
          rel: "noopener noreferrer",
          target: "_blank",
        },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: initialHtml || "",
    immediatelyRender: false,
    onCreate: ({ editor: current }) => {
      imageSrcCountsRef.current = countEditorUploadSrcs(current);
    },
    onUpdate: ({ editor: current }) => {
      const nextCounts = countEditorUploadSrcs(current);
      purgeRemovedEditorImages(imageSrcCountsRef.current, nextCounts);
      imageSrcCountsRef.current = nextCounts;
      const html = normalizeStoredHtml(current.getHTML());
      setHtmlValue(html);
      onChangeRef.current?.(html);
    },
    editorProps: {
      attributes: {
        id: id ?? name,
        class:
          variant === "compact"
            ? "rich-text-editor__content rich-text-editor__content--compact"
            : "rich-text-editor__content",
      },
      handlePaste(_view, event) {
        const items = event.clipboardData?.items;
        if (!items) return false;

        const imageFiles = Array.from(items)
          .filter((item) => item.type.startsWith("image/"))
          .map((item) => item.getAsFile())
          .filter((file): file is File => Boolean(file));

        if (imageFiles.length === 0) return false;

        event.preventDefault();
        void insertImageRef.current(imageFiles[0]);
        return true;
      },
      handleDrop(_view, event) {
        const files = event.dataTransfer?.files;
        if (!files?.length) return false;

        const imageFile = Array.from(files).find((file) => file.type.startsWith("image/"));
        if (!imageFile) return false;

        event.preventDefault();
        void insertImageRef.current(imageFile);
        return true;
      },
    },
  });

  editorRef.current = editor;

  useEffect(() => {
    if (!editor) return;
    const current = normalizeStoredHtml(editor.getHTML());
    const next = normalizeStoredHtml(initialHtml);
    if (current !== next) {
      editor.commands.setContent(initialHtml || "", { emitUpdate: false });
      setHtmlValue(next);
      imageSrcCountsRef.current = countEditorUploadSrcs(editor);
    }
  }, [editor, initialHtml]);

  const openCrop = () => {
    if (!editor?.isActive("image")) return;
    const src = String(editor.getAttributes("image").src || "");
    if (!src) {
      setUploadError("Kırpılacak görsel bulunamadı.");
      return;
    }
    setCropSrc(src);
    setCropOpen(true);
  };

  const handleCropped = async (file: File) => {
    if (!editor) return;
    setCropSaving(true);
    setUploadError(null);
    try {
      const url = await uploadEditorImage(file);
      const attrs = editor.getAttributes("image");
      editor
        .chain()
        .focus()
        .updateAttributes("image", {
          src: url,
          alt: attrs.alt || "Kırpılmış görsel",
          align: attrs.align || "left",
          size: attrs.size || "50%",
        })
        .run();
      setCropOpen(false);
      setCropSrc("");
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Kırpılmış görsel yüklenemedi.");
    } finally {
      setCropSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="rich-text-editor overflow-hidden rounded-md border border-[#e9ebec] bg-white focus-within:border-[#0ab39c] focus-within:ring-2 focus-within:ring-[#0ab39c]/20">
        <input type="hidden" name={name} value={htmlValue} />
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void insertImageRef.current(file);
          }}
        />
        {editor ? (
          <EditorToolbar
            editor={editor}
            variant={variant}
            uploading={uploading}
            onPickImage={() => fileRef.current?.click()}
          />
        ) : null}
        {editor ? <ImageControls editor={editor} onCrop={openCrop} /> : null}
        <EditorContent editor={editor} />
      </div>
      {uploadError ? (
        <p className="text-xs text-rose-600" role="alert">
          {uploadError}
        </p>
      ) : (
        <p className="text-xs text-slate-400">
          {variant === "full"
            ? "Kod bloğu ile HTML, CSS ve programlama örnekleri ekleyin; dil seçerek sitede renkli editör görünümü alın. Görsele tıklayınca hizalama, boyut ve kırpma açılır."
            : "Görsele tıklayınca hizalama (sol/sağ), boyut ve kırpma araçları açılır. Sürükle-bırak ve yapıştırma da desteklenir."}
        </p>
      )}

      <ImageCropModal
        open={cropOpen && Boolean(cropSrc)}
        imageSrc={cropSrc}
        isSaving={cropSaving}
        onClose={() => {
          if (!cropSaving) {
            setCropOpen(false);
            setCropSrc("");
          }
        }}
        onCropped={handleCropped}
      />
    </div>
  );
}
