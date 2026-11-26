// Shared by client and server components: no server code, no zod.
export const MEDIA_WIDTHS = [320, 640, 960] as const;
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
/** PDF catalogues (controller decision: 20 MB; the "100Mb/240Mb" in Figma is placeholder text). */
export const MAX_PDF_BYTES = 20 * 1024 * 1024;
/** The one file name a PDF upload is stored and served under: `<UPLOAD_DIR>/<id>/file.pdf`. */
export const PDF_FILE = "file.pdf";

export type MediaKind = "image" | "pdf";

export type MediaRef = { id: string; variants: number[] };

const ID = /^[0-9a-f-]{36}$/;
// Any stored width (1-960): images narrower than 320px keep their own width as the only variant.
const FILE = /^[1-9][0-9]{0,2}[.]webp$/;

/** Content type of a `/media/<id>/<w>.webp` or `/media/<id>/file.pdf` path (strict check), or null for anything else. */
export function mediaFileType(parts: string[]): "image/webp" | "application/pdf" | null {
  if (parts.length !== 2 || !ID.test(parts[0])) return null;
  if (FILE.test(parts[1])) return "image/webp";
  return parts[1] === PDF_FILE ? "application/pdf" : null;
}

/** Strict check of the media path segments (the only shapes the route serves). */
export function isMediaPath(parts: string[]): boolean {
  return mediaFileType(parts) !== null;
}

export const pdfSrc = (id: string): string => `/media/${id}/${PDF_FILE}`;

/** Smallest existing variant that is at least `target` wide; the largest one if none is. */
export function mediaSrc(m: MediaRef, target: number): string {
  const sorted = [...m.variants].sort((a, b) => a - b);
  const w = sorted.find((v) => v >= target) ?? sorted[sorted.length - 1];
  return `/media/${m.id}/${w}.webp`;
}

export function mediaSrcSet(m: MediaRef): string {
  return [...m.variants]
    .sort((a, b) => a - b)
    .map((w) => `/media/${m.id}/${w}.webp ${w}w`)
    .join(", ");
}
