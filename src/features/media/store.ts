import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { db } from "@/db";
import { media } from "@/db/schema";
import { uploadDir } from "@/lib/env";
import { processImage, UnsupportedFormatError } from "./process";
import { ALLOWED_TYPES, MAX_UPLOAD_BYTES } from "./url";

export type SaveResult = { id: string } | { error: "type" | "size" | "decode" };

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
  return { id };
}
