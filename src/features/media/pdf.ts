// PDF catalogues. No server imports: unit-tested, and the admin form may check a file before uploading it.

const MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2d]; // "%PDF-"

/** True only when the content itself starts with `%PDF-` (the client-supplied MIME type is not trusted). */
export function isPdf(bytes: Uint8Array): boolean {
  return bytes.length >= MAGIC.length && MAGIC.every((b, i) => bytes[i] === b);
}
