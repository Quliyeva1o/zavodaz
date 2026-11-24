// Initial client JS per page (spec §6.1, R13): gzip bytes of every JavaScript file the page loads by itself
// (until the network is idle, no interaction), the noModule polyfill excluded. Budget 150 KB = 150,000 B.
// "total" (the gate) also counts the route chunks Next prefetches for visible links (header Kataloq/Əlaqə);
// "html" is only what the page's own HTML references.
// Run against a production server: `npm run build && npx next start -p 3100`, then `npm run perf:js`.
import { gzipSync } from "node:zlib";
import { chromium } from "@playwright/test";

const BASE = process.env.PERF_BASE_URL ?? "http://localhost:3100";
const BUDGET = 150_000;
// Factory page: about (media preview) and the media tab — the YouTube facade and the lightbox trigger are client
// components; the lightbox itself must not be in the initial JS. PERF_FACTORY = a published factory with a video and photos.
const FACTORY = process.env.PERF_FACTORY ?? "figma-001";
const PAGES = ["/", "/kataloq", "/elaqe", `/fabrik/${FACTORY}`, `/fabrik/${FACTORY}/media`];
const WIDTHS = [1440, 320];

const browser = await chromium.launch({ channel: "chrome" });
const rows = [];
for (const width of WIDTHS) {
  for (const path of PAGES) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    const bodies = new Map();
    page.on("response", (res) => {
      const url = res.url();
      if (res.request().resourceType() === "script" && url.startsWith(BASE)) bodies.set(url, res.body().catch(() => null));
    });
    const res = await page.goto(BASE + path, { waitUntil: "networkidle" });
    if (!res?.ok()) throw new Error(`${path}: HTTP ${res?.status()}`);
    const html = await (await fetch(BASE + path)).text();
    const own = new Set([...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map((m) => new URL(m[1].replace(/&amp;/g, "&"), BASE).href));
    const polyfills = new Set(await page.$$eval("script[nomodule][src]", (s) => s.map((e) => e.src)));
    let bytes = 0;
    let files = 0;
    let htmlBytes = 0;
    for (const [url, body] of bodies) {
      if (polyfills.has(url)) continue;
      const buf = await body;
      if (!buf) continue;
      const size = gzipSync(buf, { level: 9 }).length;
      bytes += size;
      if (own.has(url)) htmlBytes += size;
      files++;
    }
    rows.push({ page: path, width, files, bytes, htmlBytes, ok: bytes <= BUDGET });
    await context.close();
  }
}
await browser.close();

console.log(`initial JS, gzip -9, polyfill excluded — budget ${BUDGET.toLocaleString("en")} B`);
console.log("page                       width  files   total (B)    html (B)");
for (const r of rows) {
  const n = (v) => v.toLocaleString("en").padStart(11);
  console.log(`${r.page.padEnd(25)} ${String(r.width).padStart(6)} ${String(r.files).padStart(6)} ${n(r.bytes)} ${n(r.htmlBytes)}  ${r.ok ? "ok" : "OVER"}`);
}
process.exit(rows.every((r) => r.ok) ? 0 : 1);
