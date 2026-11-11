import { readFile } from "node:fs/promises";

/** Figma reference images for the overlay — development only. */
export async function GET(_req: Request, { params }: RouteContext<"/api/dev/figma/[bp]/[name]">) {
  if (process.env.NODE_ENV !== "development") return new Response(null, { status: 404 });
  const { bp, name } = await params;
  if (!/^(desktop|mobile)$/.test(bp) || !/^[a-z0-9-]+$/.test(name)) return new Response(null, { status: 400 });
  try {
    const png = await readFile(`design/reference/${bp}/${name}.png`);
    return new Response(png, { headers: { "content-type": "image/png", "cache-control": "no-store" } });
  } catch {
    return new Response(null, { status: 404 });
  }
}
