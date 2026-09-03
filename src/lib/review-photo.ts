import {
  PRODUCT_REVIEW_PHOTO_MAX_EDGE,
  PRODUCT_REVIEW_PHOTO_MAX_INPUT_BYTES,
  PRODUCT_REVIEW_PHOTO_QUALITY,
} from "@/lib/reviews";

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Görsel sıkıştırılamadı."));
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      quality,
    );
  });
}

async function bitmapFromFile(file: File): Promise<ImageBitmap | null> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    try {
      return await createImageBitmap(file);
    } catch {
      return null;
    }
  }
}

function loadHtmlImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Görsel okunamadı."));
    };
    image.src = url;
  });
}

function drawToCanvas(
  source: CanvasImageSource,
  width: number,
  height: number,
  maxEdge: number,
): HTMLCanvasElement {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  const targetWidth = Math.max(1, Math.round(width * scale));
  const targetHeight = Math.max(1, Math.round(height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Görsel sıkıştırılamadı.");
  }
  context.drawImage(source, 0, 0, targetWidth, targetHeight);
  return canvas;
}

export async function compressReviewPhoto(
  file: File,
  maxEdge = PRODUCT_REVIEW_PHOTO_MAX_EDGE,
  quality = PRODUCT_REVIEW_PHOTO_QUALITY,
): Promise<File> {
  if (file.size > PRODUCT_REVIEW_PHOTO_MAX_INPUT_BYTES) {
    throw new Error("Görsel 20 MB sınırını aşıyor.");
  }

  const bitmap = await bitmapFromFile(file);
  let canvas: HTMLCanvasElement;
  if (bitmap) {
    try {
      canvas = drawToCanvas(bitmap, bitmap.width, bitmap.height, maxEdge);
    } finally {
      bitmap.close();
    }
  } else {
    const image = await loadHtmlImage(file);
    canvas = drawToCanvas(image, image.naturalWidth, image.naturalHeight, maxEdge);
  }

  const blob = await canvasToJpeg(canvas, quality);
  return new File([blob], "review.jpg", { type: "image/jpeg", lastModified: Date.now() });
}
