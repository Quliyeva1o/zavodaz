import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import postgres from "postgres";
import sharp from "sharp";
import { gotoHydrated } from "./db";

// Products tab, product page and the factory / product sitemaps (step 3, Task 4). R1: own rows with the "e2e-fpr" prefix.
const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
const uploadDir = path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads"));
const SLUG = "e2e-fpr";
const NAME = "E2E Məhsul Zavodu";
const MB = 1024 * 1024;
const mediaIds: string[] = [];
const factoryIds: string[] = [];
const code: Record<string, number> = {};

async function image(color: string): Promise<string> {
  const [{ id }] = await sql<{ id: string }[]>`
    insert into media (kind, width, height, variants, blur, size) values ('image', 640, 400, ${sql.json([320, 640])}, '', 1) returning id`;
  mediaIds.push(id);
  await mkdir(path.join(uploadDir, id), { recursive: true });
  for (const w of [320, 640]) {
    await writeFile(path.join(uploadDir, id, `${w}.webp`), await sharp({ create: { width: w, height: Math.round(w * 0.625), channels: 3, background: color } }).webp().toBuffer());
  }
  return id;
}

async function pdf(size: number): Promise<string> {
  const [{ id }] = await sql<{ id: string }[]>`insert into media (kind, width, height, variants, blur, size) values ('pdf', 0, 0, '[]', '', ${size}) returning id`;
  mediaIds.push(id);
  await mkdir(path.join(uploadDir, id), { recursive: true });
  await writeFile(path.join(uploadDir, id, "file.pdf"), "%PDF-1.4\n");
  return id;
}

async function invalidate(tags: string[]) {
  const now = Date.now();
  for (const tag of tags) {
    await sql`insert into cache_tags (tag, expired_at) values (${tag}, ${now}) on conflict (tag) do update set expired_at = excluded.expired_at`;
  }
  await new Promise((r) => setTimeout(r, 3_500));
}

async function cleanup() {
  const rows = await sql<{ id: string }[]>`select id from factories where slug like 'e2e-fpr%'`;
  await sql`delete from factories where slug like 'e2e-fpr%'`;
  const media = await sql<{ id: string }[]>`select id from media m where m.id = any(${mediaIds}::uuid[])`;
  if (media.length) await sql`delete from media where id = any(${media.map((m) => m.id)}::uuid[])`;
  for (const id of mediaIds) await rm(path.join(uploadDir, id), { recursive: true, force: true });
  return [...rows.map((r) => `factory:${r.id}`), ...factoryIds.map((id) => `factory:${id}`)];
}

test.use({ viewport: { width: 1440, height: 900 } });

test.beforeAll(async () => {
  test.setTimeout(60_000);
  await cleanup();
  const base = { type: "fabrik", status: "published" };
  const [main] = await sql<{ id: string }[]>`insert into factories ${sql({ ...base, slug: SLUG, name: NAME, updated_at: new Date("2025-03-04T05:06:07Z") })} returning id`;
  const [hiddenFactory] = await sql<{ id: string }[]>`insert into factories ${sql({ ...base, slug: "e2e-fpr-hidden", name: "E2E gizli zavod", status: "hidden" })} returning id`;
  const [draftFactory] = await sql<{ id: string }[]>`insert into factories ${sql({ ...base, slug: "e2e-fpr-draft", name: "E2E qaralama zavod", status: "draft" })} returning id`;
  const [other] = await sql<{ id: string }[]>`insert into factories ${sql({ ...base, slug: "e2e-fpr-other", name: "E2E başqa zavod" })} returning id`;
  factoryIds.push(main.id, hiddenFactory.id, draftFactory.id, other.id);

  const files = [
    { factory_id: main.id, media_id: await pdf(Math.round(2.5 * MB)), title: "Kataloq A", sort: 0 },
    { factory_id: main.id, media_id: await pdf(8 * MB), title: "Kataloq B", sort: 1 },
  ];
  await sql`insert into factory_files ${sql(files)}`;

  // 14 published products (2 pages of 12 + 2), newest = P14. P14 has 3 photos, P13 one, the rest none.
  const at = (i: number) => new Date(Date.UTC(2025, 0, 1, 0, i));
  const raw = [
    ...Array.from({ length: 14 }, (_, i) => ({
      factory_id: main.id,
      slug: `e2e-fpr-p${i + 1}`,
      name: `E2E Məhsul ${i + 1}`,
      description: i === 13 ? "Birinci sətir.\nİkinci sətir." : `Təsvir ${i + 1}`,
      status: "published",
      created_at: at(i + 1),
      updated_at: i === 13 ? new Date("2025-06-07T08:09:10Z") : at(i + 1),
    })),
    { factory_id: main.id, slug: "e2e-fpr-draft", name: "E2E qaralama məhsul", status: "draft", created_at: at(40) },
    { factory_id: main.id, slug: "e2e-fpr-hidden", name: "E2E gizli məhsul", status: "hidden", created_at: at(41) },
    { factory_id: hiddenFactory.id, slug: "e2e-fpr-h1", name: "E2E gizli zavodun məhsulu", status: "published", created_at: at(42) },
    { factory_id: other.id, slug: "e2e-fpr-o1", name: "E2E başqa zavodun məhsulu", status: "published", created_at: at(43) },
  ];
  const rows = raw.map((r) => ({ description: "", updated_at: r.created_at, ...r }));
  const inserted = await sql<{ id: string; slug: string }[]>`insert into products ${sql(rows)} returning id, slug`;
  for (const p of inserted) code[p.slug] = Number(p.id);
  const photos = [await image("#d16262"), await image("#47825e"), await image("#495380"), await image("#f2cc50")];
  await sql`insert into product_images ${sql([
    { product_id: code["e2e-fpr-p14"], media_id: photos[0], sort: 0 },
    { product_id: code["e2e-fpr-p14"], media_id: photos[1], sort: 1 },
    { product_id: code["e2e-fpr-p14"], media_id: photos[2], sort: 2 },
    { product_id: code["e2e-fpr-p13"], media_id: photos[3], sort: 0 },
  ])}`;
  await invalidate(["factories", "redirects", ...factoryIds.map((id) => `factory:${id}`)]);
});

test.afterAll(async () => {
  test.setTimeout(60_000);
  const tags = await cleanup();
  await invalidate(["factories", ...tags]);
  await sql.end();
});

const productPath = (lang: "az" | "en" | "ru", slug = "e2e-fpr-p14", key = `${code[slug]}-${slug}`) =>
  ({ az: `/fabrik/${SLUG}/mehsullar/`, en: `/en/factory/${SLUG}/products/`, ru: `/ru/fabrika/${SLUG}/produkciya/` })[lang] + key;
const tabPath = (lang: "az" | "en" | "ru") => ({ az: `/fabrik/${SLUG}/mehsullar`, en: `/en/factory/${SLUG}/products`, ru: `/ru/fabrika/${SLUG}/produkciya` })[lang];

const notFoundShown = async (page: Page) => {
  await expect(page.getByRole("heading", { name: "Səhifə tapılmadı" })).toBeVisible();
  await expect(page.locator('meta[name="robots"][content*="noindex"]').first()).toBeAttached();
};

test("products tab: two PDF cards with sizes that open the file, 12 cards, pagination to a 2nd page of 2", async ({ page, request }) => {
  const res = await page.goto(tabPath("az"));
  expect(res?.status()).toBe(200);
  await expect(page.getByRole("navigation", { name: "Zavod bölmələri" }).locator('[aria-current="page"]')).toHaveText("Məhsullar");

  const catalogue = page.getByRole("region", { name: "Məhsul kataloqu" });
  const cards = catalogue.getByRole("link");
  await expect(cards).toHaveCount(2);
  await expect(cards.nth(0)).toContainText("Kataloq A");
  await expect(cards.nth(0)).toContainText(/2[,.]5\s?MB/);
  await expect(cards.nth(1)).toContainText(/8\s?MB/);
  const href = (await cards.nth(0).getAttribute("href"))!;
  expect(href).toMatch(/^\/media\/[0-9a-f-]{36}\/file\.pdf$/);
  await expect(cards.nth(0)).toHaveAttribute("target", "_blank");
  const file = await request.get(href);
  expect(file.status()).toBe(200);
  expect(file.headers()["content-type"]).toBe("application/pdf");
  expect(file.headers()["content-disposition"]).toContain("inline");

  const grid = page.getByRole("region", { name: "Məhsullar", exact: true });
  await expect(grid.getByRole("article")).toHaveCount(12);
  // Newest first: P14 (code, name, description), then P13 …
  const first = grid.getByRole("article").first();
  await expect(first).toContainText(String(code["e2e-fpr-p14"]));
  await expect(first.getByRole("link", { name: "E2E Məhsul 14" })).toHaveAttribute("href", productPath("az"));
  await expect(first).toContainText("Birinci sətir. İkinci sətir.");
  await expect(first.locator("img")).toHaveCount(1);
  await expect(grid.getByRole("article").last()).toContainText("E2E Məhsul 3");

  const pager = page.getByRole("navigation", { name: "Məhsulların səhifələri" });
  await expect(pager.getByRole("link", { name: "Səhifə 2" }).first()).toHaveAttribute("href", `${tabPath("az")}?page=2`);
  await page.goto(`${tabPath("az")}?page=2`);
  await expect(grid.getByRole("article")).toHaveCount(2);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`${tabPath("az")}\\?page=2$`));
  await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Məhsulların səhifələri" }).locator('[aria-current="page"]').first()).toHaveText("2");
  // Past the last page: soft 404 (200 + noindex).
  const past = await page.goto(`${tabPath("az")}?page=3`);
  expect(past?.status()).toBe(200);
  await notFoundShown(page);
});

test("products tab in 3 languages", async ({ page }) => {
  await page.goto(tabPath("en"));
  await expect(page.getByRole("region", { name: "Product catalogue" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Products", exact: true }).getByRole("article")).toHaveCount(12);
  await expect(page.getByRole("region", { name: "Product catalogue" }).getByRole("link").first()).toContainText(/2\.5\s?MB/);
  await page.goto(tabPath("ru"));
  await expect(page.getByRole("region", { name: "Каталог продукции" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Каталог продукции" }).getByRole("link").first()).toContainText(/2,5\s?МБ/);
  await expect(page.locator('link[rel="alternate"][hreflang="az"]')).toHaveAttribute("href", new RegExp(`${tabPath("az")}$`));
});

test("products tab → product → similar product (3 languages, h1, JSON-LD, breadcrumb, canonical, hreflang)", async ({ page }) => {
  await gotoHydrated(page, tabPath("az"));
  await page.getByRole("link", { name: "E2E Məhsul 14" }).click();
  await expect(page).toHaveURL(productPath("az"));
  // Client navigation keeps the previous page hidden in the DOM (Activity): look at the visible headings only.
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("E2E Məhsul 14");
  await gotoHydrated(page, productPath("az")); // a clean DOM for the detailed checks
  await expect(page).toHaveTitle(`E2E Məhsul 14 — ${NAME} | Zavod.az`);
  await expect(page.getByText(String(code["e2e-fpr-p14"]), { exact: true })).toBeVisible();
  expect(await page.locator("article p").filter({ hasText: "Birinci sətir." }).innerText()).toBe("Birinci sətir.\nİkinci sətir.");
  await expect(page.getByRole("navigation", { name: "Zavod bölmələri" }).locator('[aria-current="page"]')).toHaveText("Məhsullar");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`${productPath("az")}$`));
  await expect(page.locator('link[rel="alternate"][hreflang="ru"]')).toHaveAttribute("href", new RegExp(`${productPath("ru")}$`));
  await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute("href", new RegExp(`${productPath("en")}$`));
  const crumb = page.getByRole("navigation", { name: "Naviqasiya" });
  await expect(crumb.getByRole("link", { name: NAME })).toHaveAttribute("href", `/fabrik/${SLUG}`);
  await expect(crumb.locator('[aria-current="page"]')).toHaveText("E2E Məhsul 14");

  const ld = await page.locator('script[type="application/ld+json"]').evaluateAll((els) => els.map((e) => JSON.parse(e.textContent!)));
  const product = ld.find((d) => d["@type"] === "Product");
  expect(product).toMatchObject({ name: "E2E Məhsul 14", brand: { "@type": "Brand", name: NAME }, description: "Birinci sətir.\nİkinci sətir." });
  expect(product.image).toHaveLength(3);
  expect(product.image[0]).toMatch(/^https?:\/\/[^/]+\/media\/[0-9a-f-]{36}\/640\.webp$/);
  expect(product.offers).toBeUndefined();
  expect(product.aggregateRating).toBeUndefined();
  expect(ld.find((d) => d["@type"] === "Organization")).toBeUndefined();
  expect(ld.find((d) => d["@type"] === "BreadcrumbList").itemListElement.map((i: { name: string }) => i.name)).toEqual(["Ana səhifə", "Fabrik", NAME, "E2E Məhsul 14"]);

  // Similar products: the 6 newest others (P13 … P8), the product itself is not among them.
  const similar = page.getByRole("region", { name: "Oxşar məhsullar" });
  await expect(similar.getByRole("article")).toHaveCount(6);
  await expect(similar.getByRole("link", { name: "E2E Məhsul 14" })).toHaveCount(0);
  await expect(similar.getByRole("article").first()).toContainText("E2E Məhsul 13");
  await similar.getByRole("link", { name: "E2E Məhsul 13" }).click();
  await expect(page).toHaveURL(productPath("az", "e2e-fpr-p13"));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("E2E Məhsul 13");

  for (const lang of ["en", "ru"] as const) {
    const res = await page.goto(productPath(lang));
    expect(res?.status()).toBe(200);
    await expect(page.locator("h1")).toHaveText("E2E Məhsul 14");
    await expect(page.getByRole("region", { name: lang === "en" ? "Similar products" : "Похожая продукция" })).toBeVisible();
  }
  // The back button leads to the products tab.
  await page.goto(productPath("az"));
  await expect(page.getByRole("link", { name: "Məhsullara qayıt" })).toHaveAttribute("href", tabPath("az"));
});

test("product gallery: first photo and thumbnail links without JavaScript; the lightbox is a lazy chunk", async ({ page, browser }) => {
  const plain = await browser.newContext({ javaScriptEnabled: false });
  const p = await plain.newPage();
  await p.goto(productPath("az"));
  const links = p.getByRole("link", { name: /^E2E Məhsul 14 — şəkil \d$/ });
  await expect(links).toHaveCount(4); // the main photo + 3 thumbnails
  const href = await links.nth(1).getAttribute("href");
  expect(href).toMatch(/^\/media\/[0-9a-f-]{36}\/640\.webp$/);
  expect((await p.request.get(href!)).headers()["content-type"]).toBe("image/webp");
  await plain.close();

  const scripts: string[] = [];
  page.on("request", (r) => r.resourceType() === "script" && scripts.push(r.url()));
  await gotoHydrated(page, productPath("az"));
  await page.waitForLoadState("networkidle");
  const before = scripts.length;
  await page.getByRole("link", { name: "E2E Məhsul 14 — şəkil 3" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  expect(scripts.length).toBeGreaterThan(before);
  await expect(dialog.getByText("3 / 3")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  // A product with one photo has no thumbnails; one without photos still renders.
  await page.goto(productPath("az", "e2e-fpr-p13"));
  await expect(page.getByRole("link", { name: /^E2E Məhsul 13 — şəkil \d$/ })).toHaveCount(1);
  await page.goto(productPath("az", "e2e-fpr-p5"));
  await expect(page.locator("h1")).toHaveText("E2E Məhsul 5");
});

test("a wrong or missing slug part answers with a real 301 to the canonical URL (3 languages, query kept)", async ({ request }) => {
  for (const lang of ["az", "en", "ru"] as const) {
    const canonical = productPath(lang);
    for (const key of [`${code["e2e-fpr-p14"]}-sehv-ad`, String(code["e2e-fpr-p14"])]) {
      const from = productPath(lang, "e2e-fpr-p14", key) + "?x=1";
      const res = await request.get(from, { maxRedirects: 0 });
      expect(res.status(), from).toBe(301);
      const location = new URL(res.headers().location, "http://localhost");
      expect(location.pathname + location.search, from).toBe(canonical + "?x=1");
    }
    expect((await request.get(canonical, { maxRedirects: 0 })).status()).toBe(200);
  }
});

test("hidden or draft products, products of a hidden factory or of another factory: soft 404 (200 + noindex), no redirect", async ({ page, request }) => {
  for (const url of [
    `/fabrik/${SLUG}/mehsullar/${code["e2e-fpr-hidden"]}-e2e-fpr-hidden`,
    `/fabrik/${SLUG}/mehsullar/${code["e2e-fpr-draft"]}-e2e-fpr-draft`,
    `/fabrik/${SLUG}/mehsullar/${code["e2e-fpr-o1"]}-e2e-fpr-o1`, // another factory's product under this factory
    `/fabrik/${SLUG}/mehsullar/${code["e2e-fpr-o1"]}-sehv`,
    `/fabrik/e2e-fpr-hidden/mehsullar/${code["e2e-fpr-h1"]}-e2e-fpr-h1`,
    `/fabrik/e2e-fpr-hidden/mehsullar/${code["e2e-fpr-h1"]}-sehv`,
    `/fabrik/${SLUG}/mehsullar/9999999-yoxdur`,
  ]) {
    const res = await request.get(url, { maxRedirects: 0 });
    expect(res.status(), url).toBe(200);
    await page.goto(url);
    await notFoundShown(page);
  }
  await page.goto(`/fabrik/e2e-fpr-hidden/mehsullar`);
  await notFoundShown(page);
  // Not a product key at all: a real 404 from the router.
  expect((await request.get(`/fabrik/${SLUG}/mehsullar/abc`)).status()).toBe(404);
});

test("sitemaps: the factory file has the main URL only (3 languages, hreflang, lastmod = updated_at); the product file has the products", async ({ request }) => {
  const factories = await (await request.get("/sitemaps/factories/sitemap/0.xml")).text();
  const locs = (xml: string) => [...xml.matchAll(/<loc>https?:\/\/[^/<]+(\/[^<]*)<\/loc>/g)].map((m) => m[1]);
  for (const p of [`/fabrik/${SLUG}`, `/en/factory/${SLUG}`, `/ru/fabrika/${SLUG}`]) expect(locs(factories), p).toContain(p);
  expect(locs(factories).filter((l) => l.includes(`${SLUG}/`)), "no tab URLs").toEqual([]);
  expect(factories).not.toContain("e2e-fpr-hidden");
  expect(factories).not.toContain("e2e-fpr-draft");
  const entry = factories.split("<url>").find((e) => e.includes(`/fabrik/${SLUG}</loc>`)) ?? "";
  expect(entry).toContain("<lastmod>2025-03-04T05:06:07.000Z</lastmod>");
  expect(entry).toContain(`/ru/fabrika/${SLUG}"`);
  expect(entry).toContain('hreflang="x-default"');

  const products = await (await request.get("/sitemaps/products/sitemap/0.xml")).text();
  for (const lang of ["az", "en", "ru"] as const) expect(locs(products), lang).toContain(productPath(lang));
  expect(locs(products)).toContain(productPath("az", "e2e-fpr-p1"));
  const item = products.split("<url>").find((e) => e.includes(`${productPath("az")}</loc>`)) ?? "";
  expect(item).toContain("<lastmod>2025-06-07T08:09:10.000Z</lastmod>");
  expect(item).toContain(`${productPath("en")}"`);
  for (const hidden of ["e2e-fpr-hidden", "e2e-fpr-draft", "e2e-fpr-h1"]) expect(products, hidden).not.toContain(hidden);
  expect(products).toContain("e2e-fpr-o1"); // another published factory's product
  // The main sitemap stays the static + catalog one.
  const main = await (await request.get("/sitemap.xml")).text();
  expect(main).not.toContain(SLUG);
});

test("the soft 404 for a wrong product code does not leak a redirect when the product exists under another factory slug part", async ({ request }) => {
  // Proxy: the factory slug in the URL must be the product's own, otherwise it is not rewritten to a 301.
  const res = await request.get(`/fabrik/e2e-fpr-other/mehsullar/${code["e2e-fpr-p14"]}-sehv`, { maxRedirects: 0 });
  expect(res.status()).toBe(200);
});
