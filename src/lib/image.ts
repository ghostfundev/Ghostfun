export type ProcessedImage = {
  dataUrl: string;
  /** Length of the data URL string — this is what the NEAR factory charges storage for. */
  chars: number;
  width: number;
  height: number;
  originalBytes: number;
  originalWidth: number;
  originalHeight: number;
  format: string;
  resized: boolean;
  animatedPreserved: boolean;
};

const ANIMATED = ["image/gif", "image/webp", "image/apng", "image/png"];

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Gambar tidak dapat dibaca. Coba file lain."));
    reader.readAsDataURL(blob);
  });
}

function encode(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      canvas.toBlob(
        (blob) => {
          if (!blob) return resolve(null);
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ""));
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(blob);
        },
        type,
        quality,
      );
    } catch {
      resolve(null);
    }
  });
}

async function loadImage(file: Blob): Promise<{ source: CanvasImageSource; width: number; height: number }> {
  try {
    const bitmap = await createImageBitmap(file);
    return { source: bitmap, width: bitmap.width, height: bitmap.height };
  } catch {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        URL.revokeObjectURL(url);
        resolve({ source: image, width: image.naturalWidth, height: image.naturalHeight });
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Format gambar ini tidak didukung browser. Gunakan PNG, JPG, WEBP, atau GIF."));
      };
      image.src = url;
    });
  }
}

function draw(source: CanvasImageSource, width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas tidak tersedia di browser ini.");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.clearRect(0, 0, width, height);
  context.drawImage(source, 0, 0, width, height);
  return canvas;
}

/**
 * Fits any uploaded image into the on-chain icon budget.
 * Small files are kept byte-for-byte so animated GIFs stay animated.
 * Anything larger is scaled down and re-encoded (WebP, then PNG, then JPEG)
 * until the encoded string fits the factory's icon limit.
 */
export async function processTokenImage(file: File, maxChars: number): Promise<ProcessedImage> {
  if (!file.type.startsWith("image/")) throw new Error("File itu bukan gambar. Unggah PNG, JPG, WEBP, atau GIF.");
  if (file.size > 25 * 1024 * 1024) throw new Error("Gambar terlalu besar (maksimal 25 MB).");

  const raw = await readAsDataUrl(file);
  const animated = ANIMATED.includes(file.type);

  if (raw.length <= maxChars) {
    return {
      dataUrl: raw, chars: raw.length, width: 0, height: 0,
      originalBytes: file.size, originalWidth: 0, originalHeight: 0,
      format: file.type, resized: false, animatedPreserved: animated,
    };
  }

  const { source, width, height } = await loadImage(file);
  if (width < 1 || height < 1) throw new Error("Gambar tidak dapat dibaca. Coba file lain.");

  const aspect = height / width;
  const sizes = [640, 512, 448, 384, 320, 256, 224, 192, 160, 128, 112, 96, 72, 56, 40].filter((size) => size <= width);
  if (!sizes.length) sizes.push(Math.max(16, Math.min(width, maxChars > 4000 ? 64 : 24)));

  const webpQualities = [0.92, 0.85, 0.78, 0.7, 0.6, 0.5, 0.4, 0.3];
  const jpegQualities = [0.86, 0.76, 0.66, 0.56];

  for (const size of sizes) {
    const scaledHeight = Math.max(1, Math.round(size * aspect));
    const canvas = draw(source, size, scaledHeight);
    for (const quality of webpQualities) {
      const dataUrl = await encode(canvas, "image/webp", quality);
      if (dataUrl && dataUrl.length <= maxChars) {
        return { dataUrl, chars: dataUrl.length, width: size, height: scaledHeight, originalBytes: file.size, originalWidth: width, originalHeight: height, format: "image/webp", resized: true, animatedPreserved: false };
      }
    }
    const png = await encode(canvas, "image/png");
    if (png && png.length <= maxChars) {
      return { dataUrl: png, chars: png.length, width: size, height: scaledHeight, originalBytes: file.size, originalWidth: width, originalHeight: height, format: "image/png", resized: true, animatedPreserved: false };
    }
    for (const quality of jpegQualities) {
      const dataUrl = await encode(canvas, "image/jpeg", quality);
      if (dataUrl && dataUrl.length <= maxChars) {
        return { dataUrl, chars: dataUrl.length, width: size, height: scaledHeight, originalBytes: file.size, originalWidth: width, originalHeight: height, format: "image/jpeg", resized: true, animatedPreserved: false };
      }
    }
  }

  throw new Error("Gambar ini tidak bisa dipadatkan cukup kecil untuk penyimpanan onchain. Coba gambar yang lebih sederhana.");
}

/** Confirms a remote image URL actually resolves to a decodable image. */
export function verifyImageUrl(url: string, timeoutMs = 9000): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Gambar tidak merespons. Periksa URL-nya.")), timeoutMs);
    const image = new Image();
    image.onload = () => {
      clearTimeout(timer);
      if (image.naturalWidth < 1) reject(new Error("Gambar tidak valid."));
      else resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      clearTimeout(timer);
      reject(new Error("Gambar tidak bisa dimuat dari URL itu."));
    };
    image.src = url;
  });
}
