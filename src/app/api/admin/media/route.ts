import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { siteUrl } from "@/lib/env";
import { saveFile } from "@/features/media/store";
import { BodyTooLargeError, isSameOrigin, readCapped, uploadBodyLimit } from "@/features/media/upload-body";
import type { MediaKind } from "@/features/media/url";

/**
 * POST /api/admin/media[?kind=pdf] — admin upload (R18). Multipart, a single `file` field.
 * Default kind `image` (8 MB, re-encoded to WebP); `?kind=pdf` takes a PDF catalogue (20 MB, `%PDF-` content only).
 * 201 { id, kind: "image", variants } | 201 { id, kind: "pdf", size } | 401 { error: "auth" } | 403 { error: "origin" } |
 * 413 { error: "size" } | 415 { error: "type" } | 422 { error: "decode" } | 400 { error: "decode" } (bad multipart).
 *
 * Kept out of server actions, so the action body limit stays at Next's default 1 MB for every action
 * (the public contact form included). Not under the proxy matcher (/api is skipped), so nothing buffers the body first.
 */
export async function POST(request: NextRequest) {
  // Same check as requireAdmin(), but a fetch() caller gets 401 JSON instead of a redirect to the login HTML.
  const user = await getSessionUser();
  if (!user || user.role !== "admin") return json({ error: "auth" }, 401);

  // CSRF: a non-action route has no built-in Origin check (the session cookie is SameSite as well).
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!isSameOrigin(request.headers.get("origin"), host, new URL(siteUrl).origin)) return json({ error: "origin" }, 403);

  const kindParam = request.nextUrl.searchParams.get("kind") ?? "image";
  if (kindParam !== "image" && kindParam !== "pdf") return json({ error: "type" }, 415);
  const kind: MediaKind = kindParam;
  const limit = uploadBodyLimit(kind);

  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > limit) return json({ error: "size" }, 413);
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("multipart/form-data")) return json({ error: "type" }, 415);

  let body: Uint8Array;
  try {
    // Counts the bytes actually received: a missing or false Content-Length cannot get past the limit.
    body = await readCapped(request.body, limit);
  } catch (e) {
    if (e instanceof BodyTooLargeError) return json({ error: "size" }, 413);
    throw e;
  }

  let form: FormData;
  try {
    form = await new Response(body as BodyInit, { headers: { "content-type": contentType } }).formData();
  } catch {
    return json({ error: "decode" }, 400);
  }
  const files = form.getAll("file");
  if (files.length !== 1 || !(files[0] instanceof File)) return json({ error: "type" }, 415);

  const saved = await saveFile(files[0], kind);
  if ("error" in saved) return json(saved, saved.error === "size" ? 413 : saved.error === "type" ? 415 : 422);
  return json(saved, 201);
}

const json = (data: unknown, status: number) => NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
