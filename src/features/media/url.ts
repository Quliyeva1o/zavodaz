// Shared by client and server components: no server code, no zod.
export const MEDIA_WIDTHS = [320, 640, 960] as const;
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export type MediaRef = { id: string; variants: number[] };

const ID = /^[0-9a-f-]{36}$/;
const FILE = /^(320|640|960)\.webp$/;

/** Strict check of the `/media/<id>/<w>.webp` path segments (the only shape the route serves). */
export function isMediaPath(parts: string[]): boolean {
  return parts.length === 2 && ID.test(parts[0]) && FILE.test(parts[1]);
}

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
