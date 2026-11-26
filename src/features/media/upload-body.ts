// Guards for the admin upload route (POST /api/admin/media). No server-only imports: unit-tested.
import { MAX_PDF_BYTES, MAX_UPLOAD_BYTES, type MediaKind } from "./url";

const MULTIPART_OVERHEAD = 64 * 1024;

/** One 8 MB image plus the multipart boundary and part headers (Next.js docs: 10–20 KB; we allow 64 KB). */
export const UPLOAD_BODY_LIMIT = MAX_UPLOAD_BYTES + MULTIPART_OVERHEAD;

/** Body cap per upload kind: an image upload keeps the 8 MB cap, a PDF catalogue gets 20 MB. */
export const uploadBodyLimit = (kind: MediaKind): number => (kind === "pdf" ? MAX_PDF_BYTES : MAX_UPLOAD_BYTES) + MULTIPART_OVERHEAD;

export class BodyTooLargeError extends Error {}

/**
 * Reads a request body but never more than `limit` bytes: a missing or false Content-Length cannot get past it.
 * Throws BodyTooLargeError (and cancels the stream) as soon as the limit is passed.
 */
export async function readCapped(body: ReadableStream<Uint8Array> | null, limit: number): Promise<Uint8Array> {
  if (!body) return new Uint8Array(0);
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) {
      await reader.cancel().catch(() => {});
      throw new BodyTooLargeError();
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.byteLength;
  }
  return out;
}

/**
 * CSRF guard for a non-action route: the Origin header must be the site origin or the request's own host
 * (as Next.js checks server actions: Origin host vs x-forwarded-host / host). No Origin → refused.
 */
export function isSameOrigin(origin: string | null, requestHost: string | null, siteOrigin: string): boolean {
  if (!origin || origin === "null") return false;
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  if (url.origin === siteOrigin) return true;
  return requestHost !== null && url.host === requestHost;
}
