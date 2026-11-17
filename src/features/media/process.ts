import sharp from "sharp";
import { MEDIA_WIDTHS } from "./url";

export type ProcessedImage = {
  width: number;
  height: number;
  blur: string;
  files: { width: number; data: Buffer }[];
};

/** Re-encodes an upload as WebP variants (never upscaled) and a tiny blur placeholder. EXIF rotation is applied. */
export async function processImage(input: Buffer): Promise<ProcessedImage> {
  const base = sharp(input).rotate();
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
