import { readFile } from "node:fs/promises";
import path from "node:path";
import { uploadDir } from "@/lib/env";
import { isMediaPath } from "@/features/media/url";

const notFound = () => new Response("Not found", { status: 404 });

export async function GET(_req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path: parts } = await ctx.params;
  if (!isMediaPath(parts)) return notFound();

  const file = path.resolve(uploadDir, ...parts);
  if (!file.startsWith(uploadDir + path.sep)) return notFound();

  try {
    const data = await readFile(file);
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return notFound();
  }
}
