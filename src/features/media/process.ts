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

// Small shared host (768 MB, 1 CPU): one libvips thread, and every variant is its own decode → resize → encode pipeline
// run one after another, so the peak memory is one image's worth (no full-size decoded copy kept between steps).
sharp.concurrency(1);

const LIMIT_INPUT_PIXELS = 25_000_000; // decompression-bomb guard

/** Re-encodes an upload as WebP variants (never upscaled) and a tiny blur placeholder. EXIF rotation is applied. */
export async function processImage(input: Buffer): Promise<ProcessedImage> {
  const open = () => sharp(input, { limitInputPixels: LIMIT_INPUT_PIXELS }).rotate(); // rotate() with no angle = EXIF auto-orient
  const { format, width: rawWidth, height: rawHeight, orientation } = await sharp(input, { limitInputPixels: LIMIT_INPUT_PIXELS }).metadata();
  if (!isAllowedFormat(format)) throw new UnsupportedFormatError(format ?? "unknown");
  if (!rawWidth || !rawHeight) throw new UnsupportedFormatError("unknown");
  // EXIF orientations 5–8 turn the image by 90°: the displayed width/height are swapped.
  const [width, height] = orientation !== undefined && orientation >= 5 ? [rawHeight, rawWidth] : [rawWidth, rawHeight];

  const fitting: number[] = MEDIA_WIDTHS.filter((w) => w <= width);
  const widths = fitting.length > 0 ? fitting : [width]; // narrower than the smallest variant: keep its own width

  const files: ProcessedImage["files"] = [];
  for (const w of widths) {
    files.push({ width: w, data: await open().resize({ width: w, withoutEnlargement: true }).webp({ quality: 78 }).toBuffer() });
  }
  const blurBuf = await open().resize(16).webp({ quality: 40 }).toBuffer();
  return { width, height, blur: `data:image/webp;base64,${blurBuf.toString("base64")}`, files };
}
