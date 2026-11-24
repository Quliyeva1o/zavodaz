import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { db } from "@/db";
import { media } from "@/db/schema";
import { uploadDir } from "@/lib/env";
import { isPdf } from "./pdf";
import { processImage, UnsupportedFormatError } from "./process";
import { deleteUnreferencedMedia, sweepOrphanMedia } from "./sweep";
import { ALLOWED_TYPES, MAX_PDF_BYTES, MAX_UPLOAD_BYTES, PDF_FILE, type MediaKind } from "./url";

export type SaveError = { error: "type" | "size" | "decode" };
export type SavedImage = { id: string; kind: "image"; variants: number[] };
export type SavedPdf = { id: string; kind: "pdf"; size: number };
export type SaveResult = SavedImage | SaveError;

/** Saves an upload of the expected kind; anything else is refused with `type` (the field decides, not the file). */
export function saveFile(file: File, kind: MediaKind): Promise<SavedImage | SavedPdf | SaveError> {
  return kind === "pdf" ? savePdf(file) : saveImage(file);
}

/** Validates an uploaded image, writes `<UPLOAD_DIR>/<id>/<w>.webp` and records it in `media`. */
export async function saveImage(file: File): Promise<SaveResult> {
  if (!(ALLOWED_TYPES as readonly string[]).includes(file.type)) return { error: "type" };
  if (file.size > MAX_UPLOAD_BYTES) return { error: "size" };

  let processed;
  try {
    processed = await processImage(Buffer.from(await file.arrayBuffer()));
  } catch (e) {
    return { error: e instanceof UnsupportedFormatError ? "type" : "decode" };
  }

  const id = randomUUID();
  const dir = path.join(uploadDir, id);
  try {
    await mkdir(dir, { recursive: true });
    await Promise.all(processed.files.map((f) => writeFile(path.join(dir, `${f.width}.webp`), f.data)));
    await db.insert(media).values({
      id,
      kind: "image",
      width: processed.width,
      height: processed.height,
      variants: processed.files.map((f) => f.width),
      blur: processed.blur,
      size: processed.files.reduce((sum, f) => sum + f.data.length, 0),
    });
  } catch (e) {
    await rm(dir, { recursive: true, force: true });
    throw e;
  }
  return { id, kind: "image", variants: processed.files.map((f) => f.width) };
}

/** Validates a PDF catalogue (≤ 20 MB, content starts with `%PDF-`), writes `<UPLOAD_DIR>/<id>/file.pdf`, records it. */
export async function savePdf(file: File): Promise<SavedPdf | SaveError> {
  if (file.size > MAX_PDF_BYTES) return { error: "size" };
  const data = Buffer.from(await file.arrayBuffer());
  if (data.length > MAX_PDF_BYTES) return { error: "size" };
  if (!isPdf(data)) return { error: "type" };

  const id = randomUUID();
  const dir = path.join(uploadDir, id);
  try {
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, PDF_FILE), data);
    await db.insert(media).values({ id, kind: "pdf", width: 0, height: 0, variants: [], blur: "", size: data.length });
  } catch (e) {
    await rm(dir, { recursive: true, force: true });
    throw e;
  }
  return { id, kind: "pdf", size: data.length };
}

/** Deletes an upload, image or PDF (row + files), unless something references it; see sweep.ts. */
export const deleteImage = (id: string): Promise<boolean> => deleteUnreferencedMedia(db, uploadDir, id);

/** Deletes unreferenced uploads older than 24 h (abandoned admin forms). */
export const deleteOrphanImages = (): Promise<number> => sweepOrphanMedia(db, uploadDir);
