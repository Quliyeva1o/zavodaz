import { createRequire } from "node:module";
import type SharpModule from "sharp";
import { MEDIA_WIDTHS } from "./url";

// sharp's CommonJS entry, loaded synchronously. A static `import` resolves its ESM entry, which Turbopack treats as
// an async module; that alone adds Turbopack's async-module code to the browser runtime chunk of every page
// (+449 B gzip on the public pages, measured in Task 10).
const sharp = createRequire(import.meta.url)("sharp") as typeof SharpModule;

export type ProcessedImage = {
  width: number;
  height: number;
  blur: string;
  files: { width: number; data: Buffer }[];
};

const ALLOWED_FORMATS = ["jpeg", "png", "webp"];

/** Thrown when the decoded content is not JPEG/PNG/WebP (the client-supplied MIME type is not trusted). */
export class UnsupportedFormatError extends Error {}

export const isAllowedFormat = (format: string | undefined): boolean => format !== undefined && ALLOWED_FORMATS.includes(format);

/** Re-encodes an upload as WebP variants (never upscaled) and a tiny blur placeholder. EXIF rotation is applied. */
export async function processImage(input: Buffer): Promise<ProcessedImage> {
  const source = sharp(input, { limitInputPixels: 40_000_000 }); // decompression-bomb guard
  const { format } = await source.metadata();
  if (!isAllowedFormat(format)) throw new UnsupportedFormatError(format ?? "unknown");
  const base = source.rotate();
  const { data: oriented, info } = await base.toBuffer({ resolveWithObject: true });
  const { width, height } = info;

  const fitting: number[] = MEDIA_WIDTHS.filter((w) => w <= width);
  const widths = fitting.length > 0 ? fitting : [width]; // narrower than the smallest variant: keep its own width

  const files = await Promise.all(
    widths.map(async (w) => ({
      width: w,
      data: await sharp(oriented).resize({ width: w, withoutEnlargement: true }).webp({ quality: 78 }).toBuffer(),
    })),
  );
  const blurBuf = await sharp(oriented).resize(16).webp({ quality: 40 }).toBuffer();
  return { width, height, blur: `data:image/webp;base64,${blurBuf.toString("base64")}`, files };
}
