import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import postgres from "postgres";
import sharp from "sharp";
import { gotoHydrated, loginAsAdmin } from "./db";

// Factory page (step 3, Task 3). R1: own rows with the "e2e-fp" prefix, own city / industry, own media files.
const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
const uploadDir = path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads"));
const SLUG = "e2e-fp";
const OLD_SLUG = "e2e-fp-old";
const CITY = "e2e-fp-city";
const NAME = "E2E Agro";
const LEGAL = "E2E Agro MMC";
const VIDEO = "dQw4w9WgXcQ";
const mediaIds: string[] = [];
const factoryIds: string[] = [];

/** A real WebP image (two widths) on disk and its media row; returns the id. */
async function image(color: string, width = 640, height = 400): Promise<string> {
  const [{ id }] = await sql<{ id: string }[]>`
    insert into media (kind, width, height, variants, blur, size) values ('image', ${width}, ${height}, ${sql.json([320, 640])}, '', 1) returning id`;
  mediaIds.push(id);
  await mkdir(path.join(uploadDir, id), { recursive: true });
  for (const w of [320, 640]) {
    const buf = await sharp({ create: { width: w, height: Math.round((w * height) / width), channels: 3, background: color } }).webp().toBuffer();
    await writeFile(path.join(uploadDir, id, `${w}.webp`), buf);
  }
  return id;
}

async function pdf(): Promise<string> {
  const [{ id }] = await sql<{ id: string }[]>`insert into media (kind, width, height, variants, blur, size) values ('pdf', 0, 0, '[]', '', 9) returning id`;
  mediaIds.push(id);
  await mkdir(path.join(uploadDir, id), { recursive: true });
  await writeFile(path.join(uploadDir, id, "file.pdf"), "%PDF-1.4\n");
  return id;
}

/** Marks the tags expired in cache_tags; the server applies it on its next tag sync (3 s). */
async function invalidate(tags: string[]) {
  const now = Date.now();
  for (const tag of tags) {
    await sql`insert into cache_tags (tag, expired_at) values (${tag}, ${now}) on conflict (tag) do update set expired_at = excluded.expired_at`;
  }
  await new Promise((r) => setTimeout(r, 3_500));
}

async function cleanup() {
  const rows = await sql<{ id: string }[]>`select id from factories where slug like 'e2e-fp%'`;
  await sql`delete from factories where slug like 'e2e-fp%'`;
  await sql`delete from redirects where from_path like '%/e2e-fp%'`;
  await sql`delete from dict_cities where slug = ${CITY}`;
  await sql`delete from dict_industries where slug = 'e2e-fp-industry'`;
  const media = await sql<{ id: string }[]>`
    select id from media m where m.id = any(${mediaIds}::uuid[])
      and not exists (select 1 from factories f where f.cover_id = m.id or f.logo_id = m.id)`;
  if (media.length) await sql`delete from media where id = any(${media.map((m) => m.id)}::uuid[])`;
  for (const id of mediaIds) await rm(path.join(uploadDir, id), { recursive: true, force: true });
  return [...rows.map((r) => `factory:${r.id}`), ...factoryIds.map((id) => `factory:${id}`)];
}

test.use({ viewport: { width: 1440, height: 900 } });

test.beforeAll(async () => {
  test.setTimeout(60_000);
  await cleanup();
  const [city] = await sql<{ id: number }[]>`
    insert into dict_cities (slug, name, sort) values (${CITY}, ${sql.json({ az: "E2E FP şəhər", en: "E2E FP city", ru: "E2E FP город" })}, 9002) returning id`;
  const [industry] = await sql<{ id: number }[]>`
    insert into dict_industries (slug, name, sort)
    values ('e2e-fp-industry', ${sql.json({ az: "E2E qida sənayesi", en: "E2E food industry", ru: "E2E пищевая" })}, 9002) returning id`;
  const cover = await image("#5d6b9a", 960, 300);
  const logo = await image("#ffffff", 320, 320);
  const photos = [];
  for (const c of ["#d16262", "#47825e", "#f2cc50", "#495380", "#6f7388", "#1a1c29"]) photos.push(await image(c));
  const certs = [await image("#edede1", 320, 450), await image("#ededf1", 320, 450), await image("#f7f7f8", 320, 450)];
  const file = await pdf();

  const base = { type: "fabrik", city_id: city.id, status: "published", verified: false };
  const [main] = await sql<{ id: string }[]>`insert into factories ${sql({
    ...base,
    slug: SLUG,
    name: NAME,
    legal_name: LEGAL,
    about: "Birinci abzas haqqında mətn.\nİkinci sətir.",
    equipment_text: "Xətt 1: qablaşdırma\nXətt 2: soyuducu",
    employee_count: 240,
    industry_id: industry.id,
    cooperation: ["partner"],
    phone: "+994 50 123 45 67",
    email: "info@e2e-agro.az",
    website: "https://www.e2e-agro.az/",
    address: "Bakı, E2E küçəsi 1",
    youtube_url: `https://www.youtube.com/watch?v=${VIDEO}`,
    socials: sql.json({ facebook: "https://facebook.com/e2e-agro", linkedin: "https://linkedin.com/company/e2e-agro" }) as unknown as string,
    verified: true,
    rating_avg: 3.5,
    rating_count: 4,
    cover_id: cover,
    logo_id: logo,
  })} returning id`;
  factoryIds.push(main.id);
  await sql`insert into factory_images ${sql(photos.map((media_id, sort) => ({ factory_id: main.id, media_id, sort })))}`;
  await sql`insert into factory_certificates ${sql(certs.map((media_id, sort) => ({ factory_id: main.id, media_id, sort, title: `Sertifikat ${sort + 1}` })))}`;
  await sql`insert into factory_files ${sql({ factory_id: main.id, media_id: file, title: "Kataloq", sort: 0 })}`;
  await sql`insert into products ${sql({ factory_id: main.id, slug: "e2e-mehsul", name: "E2E məhsul", status: "published" })}`;
  const day = (d: number) => new Date(Date.UTC(2025, 4, 20 - d, 8));
  await sql`insert into vacancies ${sql(
    Array.from({ length: 10 }, (_, i) => ({
      factory_id: main.id,
      slug: `e2e-fp-vakansiya-${i + 1}`,
      title: `E2E vakansiya ${i + 1}`,
      salary: 1000 + i * 100,
      status: "published",
      published_at: day(i),
    })),
  )}`;
  for (const [slug, status] of [
    ["e2e-fp-draft", "draft"],
    ["e2e-fp-hidden", "hidden"],
    ["e2e-fp-empty", "published"],
  ] as const) {
    const [f] = await sql<{ id: string }[]>`insert into factories ${sql({ ...base, slug, name: `E2E ${status}`, status })} returning id`;
    factoryIds.push(f.id);
  }
  // A rename e2e-fp-old → e2e-fp, as recordSlugChange stores it (3 languages × factory URL and tabs).
  const tabs = { az: ["", "/media", "/mehsullar", "/texniki-imkanlar", "/vakansiyalar"], en: ["", "/media", "/products", "/capabilities", "/vacancies"], ru: ["", "/media", "/produkciya", "/vozmozhnosti", "/vakansii"] };
  const prefix = { az: "/fabrik", en: "/en/factory", ru: "/ru/fabrika" };
  const pairs = (Object.keys(tabs) as (keyof typeof tabs)[]).flatMap((l) =>
    tabs[l].map((tab) => ({ from_path: `${prefix[l]}/${OLD_SLUG}${tab}`, to_path: `${prefix[l]}/${SLUG}${tab}` })),
  );
  await sql`insert into redirects ${sql(pairs)}`;
  await invalidate(["factories", "dictionaries", "redirects", ...factoryIds.map((id) => `factory:${id}`)]);
});

test.afterAll(async () => {
  test.setTimeout(60_000);
  const tags = await cleanup();
  await invalidate(["factories", "dictionaries", "redirects", ...tags]);
  await sql.end();
});

const TABS = {
  az: { base: `/fabrik/${SLUG}`, tabs: ["", "/media", "/mehsullar", "/texniki-imkanlar", "/vakansiyalar"], names: ["Haqqında", "Media", "Məhsullar", "Texniki imkanlar", "Vakansiyalar"] },
  en: { base: `/en/factory/${SLUG}`, tabs: ["", "/media", "/products", "/capabilities", "/vacancies"], names: ["About", "Media", "Products", "Capabilities", "Vacancies"] },
  ru: { base: `/ru/fabrika/${SLUG}`, tabs: ["", "/media", "/produkciya", "/vozmozhnosti", "/vakansii"], names: ["О компании", "Медиа", "Продукция", "Возможности", "Вакансии"] },
} as const;

const notFoundShown = async (page: Page, title = "Səhifə tapılmadı") => {
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.locator('meta[name="robots"][content*="noindex"]').first()).toBeAttached();
};

test("5 tabs × 3 languages: 200, h1 = legal name, the current tab marked, own canonical, hreflang", async ({ page }) => {
  for (const [lang, t] of Object.entries(TABS)) {
    for (const [i, tab] of t.tabs.entries()) {
      const url = t.base + tab;
      const res = await page.goto(url);
      expect(res?.status(), url).toBe(200);
      await expect(page.locator("h1"), url).toHaveText(LEGAL);
      const nav = page.getByRole("navigation", { name: lang === "az" ? "Zavod bölmələri" : lang === "en" ? "Factory sections" : "Разделы предприятия" });
      await expect(nav.locator('[aria-current="page"]'), url).toHaveText(t.names[i]);
      await expect(nav.getByRole("link")).toHaveCount(5);
      await expect(page.locator('link[rel="canonical"]'), url).toHaveAttribute("href", new RegExp(`${url.replace(/\//g, "\\/")}$`));
      await expect(page.locator('link[rel="alternate"][hreflang="ru"]'), url).toHaveAttribute("href", new RegExp(`${(TABS.ru.base + TABS.ru.tabs[i]).replace(/\//g, "\\/")}$`));
    }
  }
  await page.goto(TABS.az.base);
  await expect(page).toHaveTitle(`${NAME} — Fabrik | Zavod.az`);
  await page.goto(TABS.az.base + "/media");
  await expect(page).toHaveTitle(`${NAME} — Media | Zavod.az`);
});

test("about: text with its line break, six facts ('-' when empty), header, contacts, socials, JSON-LD", async ({ page }) => {
  await page.goto(TABS.az.base);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", "Birinci abzas haqqında mətn. İkinci sətir.");
  const about = page.getByRole("region", { name: "Haqqında məlumat" });
  expect(await about.locator("p").innerText()).toBe("Birinci abzas haqqında mətn.\nİkinci sətir.");
  const facts = await page.locator("dl > div").evaluateAll((els) => els.map((e) => [e.querySelector("dt")!.textContent, e.querySelector("dd")!.textContent]));
  expect(facts).toEqual([
    ["İstehsal sahəsi", "E2E qida sənayesi"],
    ["İstehsal olunan məhsul tipi", "-"],
    ["İstehsalat modeli", "-"],
    ["Əməkdaşlıq imkanı", "Tərəfdaş axtarır"],
    ["Ümumi işçi sayı", "240"],
    ["Gündəlik/Aylıq istehsal gücü", "-"],
  ]);
  // Header: verified pill, type, rating, the rating button slot (Task 5 mounts the modal).
  const header = page.locator('[data-figma="factory-header"]');
  await expect(header.getByText("Təsdiqlənib")).toBeVisible();
  await expect(header.getByText("Fabrik", { exact: true })).toBeVisible();
  await expect(header.getByRole("img", { name: "Reytinq 3.5 / 5" })).toBeVisible();
  await expect(header.getByRole("button", { name: "Qiymətləndir" })).toBeVisible();
  await expect(header.getByRole("img", { name: `${NAME} loqosu` })).toBeVisible();
  // Breadcrumb: Ana səhifə › Fabrik › name.
  await expect(page.getByRole("navigation", { name: "Naviqasiya" }).getByRole("link", { name: "Fabrik" })).toHaveAttribute("href", "/fabrikler");

  const contacts = page.getByRole("region", { name: "Əlaqə məlumatları" });
  await expect(contacts.getByRole("link", { name: "+994 50 123 45 67" })).toHaveAttribute("href", "tel:+994501234567");
  await expect(contacts.getByRole("link", { name: "info@e2e-agro.az" })).toHaveAttribute("href", "mailto:info@e2e-agro.az");
  const site = contacts.getByRole("link", { name: "www.e2e-agro.az" });
  await expect(site).toHaveAttribute("href", "https://www.e2e-agro.az/");
  await expect(site).toHaveAttribute("rel", "nofollow noopener");
  await expect(site).toHaveAttribute("target", "_blank");
  await expect(contacts.getByText("Bakı, E2E küçəsi 1")).toBeVisible();
  await expect(contacts.getByRole("link", { name: "Facebook" })).toHaveAttribute("href", "https://facebook.com/e2e-agro");
  await expect(contacts.getByRole("link", { name: "LinkedIn" })).toBeVisible();
  await expect(contacts.getByRole("link", { name: "TikTok" })).toHaveCount(0);

  const ld = await page.locator('script[type="application/ld+json"]').evaluateAll((els) => els.map((e) => JSON.parse(e.textContent!)));
  const org = ld.find((d) => d["@type"] === "Organization");
  expect(org).toMatchObject({ name: NAME, legalName: LEGAL, telephone: "+994 50 123 45 67" });
  expect(org.url).toMatch(/\/fabrik\/e2e-fp$/);
  expect(org.aggregateRating).toBeUndefined();
  const crumbs = ld.find((d) => d["@type"] === "BreadcrumbList");
  expect(crumbs.itemListElement.map((i: { name: string }) => i.name)).toEqual(["Ana səhifə", "Fabrik", NAME]);

  // Media preview: the video facade, the first photo large and six thumbnails; "Media" links to the tab.
  const media = page.getByRole("region", { name: "Media" });
  await expect(media.getByRole("link", { name: "Media" })).toHaveAttribute("href", `/fabrik/${SLUG}/media`);
  await expect(media.getByRole("link", { name: /^Şəkil \d: / })).toHaveCount(7);
});

test("desktop: contact card in the right column; mobile: under the header, tabs wrap (Figma order)", async ({ page }) => {
  await page.goto(TABS.az.base);
  const box = async (sel: string) => (await page.locator(sel).boundingBox())!;
  let [header, contacts, tabs] = [await box('[data-figma="factory-header"]'), await box('[data-figma="factory-contacts"]'), await box('[data-figma="factory-tabs"]')];
  expect(Math.round(header.width)).toBe(893);
  expect(Math.round(contacts.width)).toBe(397);
  expect(contacts.x).toBeGreaterThan(header.x + header.width);
  expect(Math.round(contacts.y)).toBe(Math.round(header.y));
  expect(Math.round(tabs.y - (header.y + header.height))).toBe(32);

  await page.setViewportSize({ width: 320, height: 800 });
  await page.reload();
  [header, contacts, tabs] = [await box('[data-figma="factory-header"]'), await box('[data-figma="factory-contacts"]'), await box('[data-figma="factory-tabs"]')];
  expect(Math.round(contacts.y - (header.y + header.height))).toBe(32);
  expect(Math.round(tabs.y - (contacts.y + contacts.height))).toBe(32);
  expect(Math.round(tabs.height)).toBe(82); // two rows of 36 + 10 (Figma 767:23295)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
});

test("YouTube: only the thumbnail on load (no YouTube script, no iframe); the nocookie player after the click", async ({ page }) => {
  const youtube: string[] = [];
  page.on("request", (r) => {
    if (/youtube(-nocookie)?\.com|googlevideo|ytimg/.test(r.url()) && !r.url().includes("i.ytimg.com/vi/")) youtube.push(r.url());
  });
  await gotoHydrated(page, TABS.az.base + "/media");
  await page.waitForLoadState("networkidle");
  expect(youtube).toEqual([]);
  await expect(page.locator("iframe")).toHaveCount(0);
  const facade = page.getByRole("link", { name: `Videonu oynat: ${NAME}` });
  await expect(facade).toHaveAttribute("href", `https://www.youtube.com/watch?v=${VIDEO}`);
  await expect(facade.locator("img").first()).toHaveAttribute("src", `https://i.ytimg.com/vi/${VIDEO}/hqdefault.jpg`);
  await facade.click();
  await expect(page.locator("iframe")).toHaveAttribute("src", new RegExp(`^https://www\\.youtube-nocookie\\.com/embed/${VIDEO}\\?autoplay=1`));
});

test("lightbox: lazy chunk on click, ← / → move (wrapping), Escape closes and focus returns to the photo", async ({ page }) => {
  const scripts: string[] = [];
  page.on("request", (r) => r.resourceType() === "script" && scripts.push(r.url()));
  await gotoHydrated(page, TABS.az.base + "/media");
  await page.waitForLoadState("networkidle");
  const before = scripts.length;
  const third = page.getByRole("region", { name: "Şəkillər" }).getByRole("link", { name: `Şəkil 3: ${NAME}` });
  await expect(third).toHaveAttribute("href", /\/media\/[0-9a-f-]{36}\/640\.webp$/);
  await third.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  expect(scripts.length).toBeGreaterThan(before); // the lightbox chunk came with the click
  await expect(dialog.getByRole("img")).toHaveAttribute("alt", `Şəkil 3: ${NAME}`);
  await expect(dialog.getByText("3 / 6")).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(dialog.getByText("4 / 6")).toBeVisible();
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  await expect(dialog.getByText("1 / 6")).toBeVisible();
  await page.keyboard.press("ArrowLeft");
  await expect(dialog.getByText("6 / 6")).toBeVisible();
  await dialog.getByRole("button", { name: "Növbəti şəkil" }).click();
  await expect(dialog.getByText("1 / 6")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(third).toBeFocused();
});

test("without JavaScript a photo link opens the image file itself", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(TABS.az.base + "/media");
  const href = await page.getByRole("link", { name: `Şəkil 2: ${NAME}` }).first().getAttribute("href");
  expect((await page.request.get(href!)).headers()["content-type"]).toBe("image/webp");
  await context.close();
});

test("capabilities: equipment text keeps its line breaks; certificates open in the lightbox", async ({ page }) => {
  await gotoHydrated(page, TABS.az.base + "/texniki-imkanlar");
  const equipment = page.getByRole("region", { name: "Texniki avadanlıqların siyahısı" });
  expect(await equipment.locator("p").innerText()).toBe("Xətt 1: qablaşdırma\nXətt 2: soyuducu");
  const certs = page.getByRole("region", { name: "Sertifikatlar" }).getByRole("link");
  await expect(certs).toHaveCount(3);
  await certs.nth(1).click();
  await expect(page.getByRole("dialog").getByRole("img")).toHaveAttribute("alt", "Sertifikat 2");
});

test("vacancies: 8, 'Daha çox göstər' → ?page=2 shows all 10 (also without JS); past the last page: soft 404; empty state", async ({ page, browser }) => {
  await page.goto(TABS.az.base + "/vakansiyalar");
  const cards = page.locator("main article");
  await expect(cards).toHaveCount(8);
  await expect(cards.first().getByRole("link", { name: "E2E vakansiya 1" })).toHaveAttribute("href", "/vakansiyalar/e2e-fp-vakansiya-1");
  await expect(cards.first()).toContainText("20.05.2025");
  await expect(cards.first()).toContainText("1000₼");
  await expect(cards.first()).toContainText(LEGAL);
  await page.getByRole("link", { name: "Daha çox göstər" }).click();
  await expect(page).toHaveURL(`/fabrik/${SLUG}/vakansiyalar?page=2`);
  await expect(cards).toHaveCount(10);
  await expect(page.getByRole("link", { name: "Daha çox göstər" })).toHaveCount(0);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, follow");

  const context = await browser.newContext({ javaScriptEnabled: false });
  const noJs = await context.newPage();
  await noJs.goto(TABS.en.base + "/vacancies");
  await noJs.getByRole("link", { name: "Show more" }).click();
  await expect(noJs).toHaveURL(`/en/factory/${SLUG}/vacancies?page=2`);
  await expect(noJs.locator("main article")).toHaveCount(10);
  await context.close();

  await page.goto(TABS.az.base + "/vakansiyalar?page=3");
  await notFoundShown(page);
  await page.goto("/fabrik/e2e-fp-empty/vakansiyalar");
  await expect(page.getByText("Hazırda açıq vakansiya yoxdur")).toBeVisible();
});

test("draft, hidden and unknown factories are not found (soft 404 + noindex); an admin sees a draft with ?preview=1", async ({ page }) => {
  for (const url of ["/fabrik/e2e-fp-draft", "/fabrik/e2e-fp-hidden/media", "/fabrik/e2e-fp-nope", "/fabrik/e2e-fp-draft?preview=1"]) {
    await page.goto(url);
    await notFoundShown(page);
  }
  await page.goto("/en/factory/e2e-fp-nope");
  await notFoundShown(page, "Page not found");
  // A product page arrives with Task 4; an unknown sub path is a real 404 from the proxy.
  expect((await page.request.get(`/fabrik/${SLUG}/yox`)).status()).toBe(404);

  await loginAsAdmin(page);
  await page.goto("/fabrik/e2e-fp-draft?preview=1");
  await expect(page.locator("h1")).toHaveText("E2E draft");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, follow");
  // The tabs keep the preview.
  await expect(page.getByRole("navigation", { name: "Zavod bölmələri" }).getByRole("link", { name: "Media" })).toHaveAttribute("href", "/fabrik/e2e-fp-draft/media?preview=1");
});

test("an old slug answers with a real 301 to the new URL — every tab and language, product paths and the query follow", async ({ request, page }) => {
  for (const [from, to] of [
    [`/fabrik/${OLD_SLUG}`, `/fabrik/${SLUG}`],
    [`/en/factory/${OLD_SLUG}/capabilities`, `/en/factory/${SLUG}/capabilities`],
    [`/ru/fabrika/${OLD_SLUG}/vakansii?page=2`, `/ru/fabrika/${SLUG}/vakansii?page=2`],
    [`/fabrik/${OLD_SLUG}/mehsullar/1000001-kohne`, `/fabrik/${SLUG}/mehsullar/1000001-kohne`],
  ]) {
    const res = await request.get(from, { maxRedirects: 0 });
    expect(res.status(), from).toBe(301);
    const location = new URL(res.headers().location, "http://localhost");
    expect(location.pathname + location.search, from).toBe(to);
  }
  await page.goto(`/fabrik/${OLD_SLUG}/media`);
  await expect(page).toHaveURL(`/fabrik/${SLUG}/media`);
  await expect(page.locator("h1")).toHaveText(LEGAL);
});

test("catalog card → factory page", async ({ page }) => {
  await page.goto(`/kataloq?city=${CITY}`);
  await page.locator("main article").filter({ hasText: NAME }).getByRole("link", { name: NAME }).click();
  await expect(page).toHaveURL(`/fabrik/${SLUG}`);
  await expect(page.locator("h1")).toHaveText(LEGAL);
});
