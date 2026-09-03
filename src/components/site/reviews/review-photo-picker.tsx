"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Camera, ImagePlus, X } from "lucide-react";
import { SiteImage } from "@/components/site/site-image";
import { compressReviewPhoto } from "@/lib/review-photo";
import { PRODUCT_REVIEW_MAX_PHOTOS } from "@/lib/reviews";

type ExistingSlot = { kind: "existing"; url: string };
type NewSlot = { kind: "new"; file: File; preview: string };
type PhotoSlot = ExistingSlot | NewSlot;

function isImageFile(file: File) {
  if (file.type.startsWith("image/")) return true;
  return /\.(jpe?g|png|webp|gif|heic|heif|avif|bmp)$/i.test(file.name);
}

export function ReviewPhotoPicker({
  existingUrls,
  disabled,
  onChange,
}: {
  existingUrls: string[];
  disabled?: boolean;
  onChange: (payload: { keepUrls: string[]; files: File[] }) => void;
}) {
  const galleryId = useId();
  const cameraId = useId();
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const slotsRef = useRef<PhotoSlot[]>([]);
  const [slots, setSlots] = useState<PhotoSlot[]>(() =>
    existingUrls.map((url) => ({ kind: "existing", url })),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  slotsRef.current = slots;

  useEffect(() => {
    onChange({
      keepUrls: slots.filter((slot): slot is ExistingSlot => slot.kind === "existing").map((slot) => slot.url),
      files: slots.filter((slot): slot is NewSlot => slot.kind === "new").map((slot) => slot.file),
    });
  }, [onChange, slots]);

  useEffect(() => {
    return () => {
      for (const slot of slotsRef.current) {
        if (slot.kind === "new") URL.revokeObjectURL(slot.preview);
      }
    };
  }, []);

  const remaining = PRODUCT_REVIEW_MAX_PHOTOS - slots.length;

  async function addFiles(list: FileList | File[]) {
    const incoming = Array.from(list).filter(isImageFile);
    if (incoming.length === 0) return;
    const room = PRODUCT_REVIEW_MAX_PHOTOS - slots.length;
    if (room <= 0) {
      setError(`En fazla ${PRODUCT_REVIEW_MAX_PHOTOS} fotoğraf ekleyebilirsiniz.`);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const chosen = incoming.slice(0, room);
      const compressed = await Promise.all(chosen.map((file) => compressReviewPhoto(file)));
      setSlots((current) => {
        const space = PRODUCT_REVIEW_MAX_PHOTOS - current.length;
        const next = compressed.slice(0, space).map((file) => ({
          kind: "new" as const,
          file,
          preview: URL.createObjectURL(file),
        }));
        return [...current, ...next];
      });
      if (incoming.length > room) {
        setError(`En fazla ${PRODUCT_REVIEW_MAX_PHOTOS} fotoğraf ekleyebilirsiniz.`);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Görsel işlenemedi.");
    } finally {
      setBusy(false);
      if (galleryRef.current) galleryRef.current.value = "";
      if (cameraRef.current) cameraRef.current.value = "";
    }
  }

  function removeAt(index: number) {
    setSlots((current) => {
      const target = current[index];
      if (target?.kind === "new") URL.revokeObjectURL(target.preview);
      return current.filter((_, itemIndex) => itemIndex !== index);
    });
    setError(null);
  }

  return (
    <div>
      <p className="text-sm font-medium text-site-fg">Fotoğraf ekle (isteğe bağlı)</p>
      <p className="mt-1 text-xs text-site-muted">
        Galeriden seçin veya kamerayla çekin. Telefon fotoğrafları yüklemeden önce küçültülür. En fazla{" "}
        {PRODUCT_REVIEW_MAX_PHOTOS} görsel.
      </p>

      {slots.length > 0 ? (
        <ul className="mt-3 grid grid-cols-4 gap-2">
          {slots.map((slot, index) => {
            const src = slot.kind === "existing" ? slot.url : slot.preview;
            return (
              <li key={`${slot.kind}-${index}-${src}`} className="relative aspect-square overflow-hidden rounded-lg border border-site-border bg-site-surface">
                {src.startsWith("blob:") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={src} alt={`Yorum görseli ${index + 1}`} className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <SiteImage src={src} alt={`Yorum görseli ${index + 1}`} fill className="object-cover" sizes="80px" />
                )}
                <button
                  type="button"
                  onClick={() => removeAt(index)}
                  disabled={disabled || busy}
                  className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white disabled:opacity-50"
                  aria-label="Görseli kaldır"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <label
          htmlFor={galleryId}
          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-site-border px-3 py-2 text-sm font-medium text-site-fg ${
            disabled || busy || remaining <= 0 ? "pointer-events-none opacity-50" : "hover:bg-site-surface"
          }`}
        >
          <ImagePlus className="h-4 w-4" />
          Galeriden seç
        </label>
        <label
          htmlFor={cameraId}
          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-site-border px-3 py-2 text-sm font-medium text-site-fg ${
            disabled || busy || remaining <= 0 ? "pointer-events-none opacity-50" : "hover:bg-site-surface"
          }`}
        >
          <Camera className="h-4 w-4" />
          Kamerayla çek
        </label>
      </div>

      <input
        id={galleryId}
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        disabled={disabled || busy || remaining <= 0}
        onChange={(event) => {
          if (event.target.files) void addFiles(event.target.files);
        }}
      />
      <input
        id={cameraId}
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        disabled={disabled || busy || remaining <= 0}
        onChange={(event) => {
          if (event.target.files) void addFiles(event.target.files);
        }}
      />

      {busy ? <p className="mt-2 text-xs text-site-muted">Görseller küçültülüyor...</p> : null}
      {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}
    </div>
  );
}
