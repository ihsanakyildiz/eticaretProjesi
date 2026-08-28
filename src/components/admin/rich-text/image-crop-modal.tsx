"use client";

import { useCallback, useEffect, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Crop, Loader2, X } from "lucide-react";

type AspectOption = {
  label: string;
  value: number | undefined;
};

const ASPECT_OPTIONS: AspectOption[] = [
  { label: "Serbest", value: undefined },
  { label: "1:1", value: 1 },
  { label: "4:3", value: 4 / 3 },
  { label: "16:9", value: 16 / 9 },
  { label: "3:4", value: 3 / 4 },
];

async function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.crossOrigin = "anonymous";
    image.src = url;
  });
}

async function getCroppedBlob(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas desteklenmiyor.");

  canvas.width = Math.max(1, Math.round(pixelCrop.width));
  canvas.height = Math.max(1, Math.round(pixelCrop.height));

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Kırpılmış görsel oluşturulamadı."));
          return;
        }
        resolve(blob);
      },
      "image/png",
      0.95,
    );
  });
}

type ImageCropModalProps = {
  imageSrc: string;
  open: boolean;
  isSaving?: boolean;
  onClose: () => void;
  onCropped: (file: File) => void | Promise<void>;
};

export function ImageCropModal({
  imageSrc,
  open,
  isSaving = false,
  onClose,
  onCropped,
}: ImageCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspect, setAspect] = useState<number | undefined>(undefined);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setAspect(undefined);
    setCroppedAreaPixels(null);
    setError(null);
  }, [open, imageSrc]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSaving) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, isSaving, onClose]);

  const onCropComplete = useCallback((_area: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  if (!open) return null;

  const handleApply = async () => {
    if (!croppedAreaPixels) {
      setError("Kırpma alanı seçilemedi.");
      return;
    }
    setError(null);
    try {
      const blob = await getCroppedBlob(imageSrc, croppedAreaPixels);
      const file = new File([blob], `crop-${Date.now()}.png`, { type: "image/png" });
      await onCropped(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kırpma başarısız.");
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Kapat"
        className="absolute inset-0 bg-slate-900/55"
        disabled={isSaving}
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="image-crop-title"
        className="relative flex w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-[#e9ebec] bg-white shadow-xl"
      >
        <div className="flex items-start gap-3 border-b border-[#e9ebec] px-5 py-4">
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#405189]/10 text-[#405189]">
            <Crop className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="image-crop-title" className="text-base font-semibold text-slate-800">
              Görseli kırp
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Alanı sürükleyin, zoom ile yakınlaştırın; oran seçebilirsiniz.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative h-[360px] bg-slate-900 sm:h-[420px]">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            showGrid
          />
        </div>

        <div className="space-y-4 border-t border-[#e9ebec] px-5 py-4">
          <div className="flex flex-wrap gap-2">
            {ASPECT_OPTIONS.map((option) => {
              const active = aspect === option.value;
              return (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => setAspect(option.value)}
                  className={`rounded-md border px-3 py-1.5 text-xs font-medium transition ${
                    active
                      ? "border-[#405189] bg-[#405189] text-white"
                      : "border-[#e9ebec] bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          <label className="flex items-center gap-3 text-sm text-slate-600">
            <span className="w-12 shrink-0">Zoom</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full accent-[#0ab39c]"
            />
            <span className="w-10 shrink-0 text-right text-xs text-slate-400">
              {zoom.toFixed(1)}x
            </span>
          </label>

          {error ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-[#e9ebec] bg-[#f3f6f9] px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-md border border-[#e9ebec] bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
          >
            Vazgeç
          </button>
          <button
            type="button"
            onClick={() => void handleApply()}
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-md bg-[#0ab39c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#099885] disabled:opacity-70"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crop className="h-4 w-4" />}
            Kırp ve Uygula
          </button>
        </div>
      </div>
    </div>
  );
}
