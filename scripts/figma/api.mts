// Minimal Figma REST client for the design scripts. Token: FIGMA_TOKEN (.env.local).
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export type FigmaColor = { r: number; g: number; b: number; a: number };
export type FigmaNode = {
  id: string;
  name: string;
  type: string;
  visible?: boolean;
  characters?: string;
  children?: FigmaNode[];
  absoluteBoundingBox?: { x: number; y: number; width: number; height: number };
  style?: { fontFamily: string; fontWeight: number; fontSize: number; lineHeightPx: number; letterSpacing: number; textCase?: string };
  styles?: Record<string, string>;
  fills?: { type: string; visible?: boolean; color?: FigmaColor; opacity?: number }[];
  [key: string]: unknown;
};
export type FigmaFile = {
  name: string;
  lastModified: string;
  document: FigmaNode;
  styles: Record<string, { name: string; styleType: string }>;
  components: Record<string, { name: string }>;
};

export const FILE_KEY = process.env.FIGMA_FILE_KEY ?? "iLz9wZPvZmcyxEWRKjMY4m";
const TOKEN = process.env.FIGMA_TOKEN;
const CACHE = "design/.cache/file.json";

async function figma<T>(path: string): Promise<T> {
  if (!TOKEN) throw new Error("FIGMA_TOKEN is not set (.env.local)");
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`https://api.figma.com/v1${path}`, { headers: { "X-Figma-Token": TOKEN } });
    if (res.status === 429 && attempt < 5) {
      const wait = Number(res.headers.get("retry-after")) || 2 ** attempt * 5;
      if (wait > 120) {
        const hours = Math.ceil(wait / 3600);
        const type = res.headers.get("x-figma-rate-limit-type") ?? "?";
        throw new Error(
          `Figma API rate limit: retry after ~${hours} h (x-figma-rate-limit-type: ${type}). Use a token from a higher-tier Figma seat or wait.`,
        );
      }
      console.warn(`Figma rate limit — waiting ${wait}s`);
      await new Promise((r) => setTimeout(r, wait * 1000));
      continue;
    }
    if (!res.ok) throw new Error(`Figma ${path}: ${res.status} ${await res.text()}`);
    return (await res.json()) as T;
  }
}

/** Whole file (~80 MB). Reused for 10 minutes so several scripts in a row do not re-download it. */
export async function getFile(): Promise<FigmaFile> {
  const fresh = await stat(CACHE).then((s) => Date.now() - s.mtimeMs < 10 * 60_000, () => false);
  if (fresh) return JSON.parse(await readFile(CACHE, "utf8")) as FigmaFile;
  const file = await figma<FigmaFile>(`/files/${FILE_KEY}`);
  await mkdir(dirname(CACHE), { recursive: true });
  await writeFile(CACHE, JSON.stringify(file));
  return file;
}

/** Local copy of the whole file regardless of age (fallback when the API is rate-limited). */
export async function loadCachedFile(): Promise<FigmaFile> {
  return JSON.parse(await readFile(CACHE, "utf8")) as FigmaFile;
}

export async function getNodes(ids: string[]) {
  const res = await figma<{ nodes: Record<string, { document: FigmaNode } | null> }>(
    `/files/${FILE_KEY}/nodes?ids=${encodeURIComponent(ids.join(","))}`,
  );
  const missing = ids.filter((id) => !res.nodes[id]);
  if (missing.length) throw new Error(`Figma nodes not found (renamed or deleted?): ${missing.join(", ")}`);
  return res.nodes as Record<string, { document: FigmaNode }>;
}

export async function exportImages(ids: string[], opts: { format: "png" | "svg"; scale?: number }) {
  const q = new URLSearchParams({ ids: ids.join(","), format: opts.format, scale: String(opts.scale ?? 1) });
  if (opts.format === "svg") q.set("svg_outline_text", "true");
  const res = await figma<{ images: Record<string, string | null> }>(`/images/${FILE_KEY}?${q}`);
  const missing = ids.filter((id) => !res.images[id]);
  if (missing.length) throw new Error(`Figma could not render: ${missing.join(", ")}`);
  return res.images as Record<string, string>;
}

export async function download(url: string, file: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed ${res.status}: ${url}`);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, Buffer.from(await res.arrayBuffer()));
}

export function findNode(root: FigmaNode, id: string): FigmaNode | undefined {
  if (root.id === id) return root;
  for (const child of root.children ?? []) {
    const hit = findNode(child, id);
    if (hit) return hit;
  }
  return undefined;
}

export function walk(root: FigmaNode, visit: (n: FigmaNode) => void) {
  visit(root);
  for (const child of root.children ?? []) walk(child, visit);
}
