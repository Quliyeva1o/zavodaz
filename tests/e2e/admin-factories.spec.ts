import { expect, test, type Page } from "@playwright/test";
import { access, readFile, rm } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";
import { gotoHydrated, loginAsAdmin, resetRateLimits } from "./db";

// R1: own rows only (slug prefix "e2e-adm"); catalog assertions go through ?city=<own city>.
const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
const uploadDir = path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads"));
const CITY = { slug: "e2e-adm-city", name: "E2E admin şəhər" };
const FACTORY = "E2E Admin Fabrik";
const SAMPLE = "tests/fixtures/sample.jpg";
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/;

const seenMedia = new Set<string>();
const exists = (p: string) => access(p).then(() => true, () => false);

async function cleanup() {
  if (!/@(localhost|127\.0\.0\.1)[:/]/.test(process.env.DATABASE_URL ?? "")) throw new Error("local database only");
  const covers = await sql<{ id: string }[]>`select cover_id as id from factories where slug like 'e2e-adm%' and cover_id is not null`;
  for (const c of covers) seenMedia.add(c.id);
  await sql`delete from factories where slug like 'e2e-adm%'`;
  for (const id of seenMedia) {
    await sql`delete from media where id = ${id}`;
    await rm(path.join(uploadDir, id), { recursive: true, force: true });
  }
  await sql`delete from dict_cities where slug like 'e2e-adm%'`;
  // The server applies these on its next tag sync (tag-sync.ts, every 3 s).
  const now = Date.now();
  await sql`insert into cache_tags (tag, expired_at) values ('dictionaries', ${now}), ('factories', ${now})
    on conflict (tag) do update set expired_at = excluded.expired_at`;
  await new Promise((r) => setTimeout(r, 3_500));
}

test.describe.configure({ mode: "serial" });
test.use({ viewport: { width: 1440, height: 900 } });
test.beforeAll(async () => {
  test.setTimeout(30_000);
  await cleanup();
});
test.afterAll(async () => {
  test.setTimeout(30_000);
  await cleanup();
  await sql.end();
});
test.afterEach(resetRateLimits);

const cards = (page: Page) => page.locator("main article");
const coverIdOf = async (slug: string) => (await sql<{ id: string | null }[]>`select cover_id as id from factories where slug = ${slug}`)[0]?.id ?? null;

test("dictionary: a new city is saved and shows up in the catalog filter; a slug used by an industry is rejected", async ({ page }) => {
  await loginAsAdmin(page);
  await gotoHydrated(page, "/admin/dictionaries/cities");
  await page.getByRole("button", { name: "Yeni dəyər" }).click();
  await page.getByLabel("Ad (AZ)").fill(CITY.name);
  await page.getByLabel(/^Slug/).fill(CITY.slug);
  await page.getByRole("button", { name: "Yadda saxla" }).click();
  await expect(page.getByRole("status")).toHaveText("Yadda saxlanıldı");
  await expect(page.getByRole("row", { name: new RegExp(CITY.name) })).toContainText(CITY.slug);

  // Cities and industries share the landing segment: "metal-emali" is an industry (seed).
  await page.getByRole("button", { name: "Yeni dəyər" }).click();
  await page.getByLabel("Ad (AZ)").fill("E2E toqquşma");
  await page.getByLabel(/^Slug/).fill("metal-emali");
  await page.getByRole("button", { name: "Yadda saxla" }).click();
  await expect(page.getByText("Bu slug „Sahələr“ lüğətində var (landing ünvanı toqquşur)")).toBeVisible();
  await expect(page.getByLabel("Ad (AZ)")).toHaveValue("E2E toqquşma");
  await expect(page.getByLabel(/^Slug/)).toHaveValue("metal-emali");

  await page.goto("/kataloq");
  await page.getByRole("combobox", { name: "Şəhər / Region" }).click();
  await expect(page.getByRole("option", { name: CITY.name })).toBeVisible();
});

test("factory: created with a cover as published Premium → in the catalog and Recommended; errors keep the values; cover replaced; hidden → gone", async ({ page, request }) => {
  test.setTimeout(90_000);
  await loginAsAdmin(page);
  await gotoHydrated(page, "/admin/factories/new");
  await page.getByLabel("Tip", { exact: true }).selectOption("fabrik");
  await page.getByLabel("Ad", { exact: true }).fill(FACTORY);
  await page.getByLabel("Haqqında").fill("E2E admin testi");
  await page.getByLabel("Şəhər / Region").selectOption({ label: CITY.name });
  await page.getByLabel("Status").selectOption("published");
  await page.getByLabel("Tarif", { exact: true }).selectOption("premium");
  await page.getByLabel("Təsdiqlənib").check();
  // R18: the file goes to POST /api/admin/media first; the form then sends only the media id.
  await page.getByLabel(/^Örtük şəkli/).setInputFiles(SAMPLE);
  await expect(page.getByRole("img", { name: "Yeni örtük şəkli" })).toBeVisible();
  await page.getByRole("button", { name: "Yadda saxla" }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/factories/${UUID.source}\\?saved=1$`));
  await expect(page.getByRole("status")).toHaveText("Yadda saxlanıldı");
  const editUrl = page.url().replace(/\?.*$/, "");
  // Cache Components keeps the previous route (the empty "new" form) mounted but hidden: load the edit page fresh.
  await gotoHydrated(page, editUrl);
  await expect(page.getByLabel(/^Slug/)).toHaveValue("e2e-admin-fabrik");

  const [row] = await sql<{ tariff_rank: number; status: string; verified: boolean }[]>`select tariff_rank, status, verified from factories where slug = 'e2e-admin-fabrik'`;
  expect(row).toEqual({ tariff_rank: 1, status: "published", verified: true });
  const firstCover = await coverIdOf("e2e-admin-fabrik");
  expect(firstCover).toMatch(UUID);
  seenMedia.add(firstCover!);

  // Public catalog (the admin save invalidated the cache in this process).
  await page.goto(`/kataloq?city=${CITY.slug}`);
  await expect(cards(page)).toHaveCount(1);
  await expect(cards(page).locator("h3")).toHaveText(FACTORY);
  const src = await cards(page).locator(`img[src^="/media/"]`).getAttribute("src");
  expect(src).toContain(`/media/${firstCover}/`);
  expect((await request.get(`/media/${firstCover}/640.webp`)).status()).toBe(200);
  await page.goto(`/kataloq/tovsiyye-edilenler?city=${CITY.slug}`);
  await expect(cards(page).locator("h3")).toHaveText(FACTORY);

  // A validation error keeps what was typed.
  await gotoHydrated(page, editUrl);
  await page.getByLabel("Ad", { exact: true }).fill("E");
  await page.getByLabel("Haqqında").fill("Dəyişdirilmiş mətn");
  await page.getByRole("button", { name: "Yadda saxla" }).click();
  await expect(page.getByText("Ən azı 2 simvol")).toBeVisible();
  await expect(page.getByLabel("Ad", { exact: true })).toHaveValue("E");
  await expect(page.getByLabel("Haqqında")).toHaveValue("Dəyişdirilmiş mətn");
  await expect(page.getByLabel("Status")).toHaveValue("published");
  await expect(page.getByLabel("Təsdiqlənib")).toBeChecked();

  // A file that is not an image (but claims to be a JPEG) is refused by the upload route; the typed values stay.
  await page.getByLabel("Ad", { exact: true }).fill(FACTORY);
  await page.getByLabel(/^Örtük şəkli/).setInputFiles({ name: "x.jpg", mimeType: "image/jpeg", buffer: Buffer.from("şəkil deyil") });
  await expect(page.getByText("Şəkil oxunmadı")).toBeVisible();
  await expect(page.getByLabel("Ad", { exact: true })).toHaveValue(FACTORY);
  await expect(page.getByLabel("Haqqında")).toHaveValue("Dəyişdirilmiş mətn");
  expect(await coverIdOf("e2e-admin-fabrik")).toBe(firstCover);

  // Replacing the cover deletes the old media row and its directory.
  await page.getByLabel(/^Örtük şəkli/).setInputFiles(SAMPLE);
  await expect(page.getByRole("img", { name: "Yeni örtük şəkli" })).toBeVisible();
  await page.getByRole("button", { name: "Yadda saxla" }).click();
  await expect(page.getByRole("status")).toHaveText("Yadda saxlanıldı");
  const secondCover = await coverIdOf("e2e-admin-fabrik");
  expect(secondCover).toMatch(UUID);
  expect(secondCover).not.toBe(firstCover);
  seenMedia.add(secondCover!);
  expect(await sql`select 1 from media where id = ${firstCover!}`).toHaveLength(0);
  expect(await exists(path.join(uploadDir, firstCover!))).toBe(false);
  expect(await exists(path.join(uploadDir, secondCover!, "640.webp"))).toBe(true);
  await expect(page.getByRole("img", { name: "Mövcud örtük şəkli" })).toHaveAttribute("src", new RegExp(secondCover!));

  // "Gizlət" → status hidden → gone from the catalog.
  await page.getByRole("button", { name: "Gizlət" }).click();
  await expect(page.getByRole("status")).toHaveText("Yadda saxlanıldı");
  await expect(page.getByLabel("Status")).toHaveValue("hidden");
  expect((await sql<{ status: string }[]>`select status from factories where slug = 'e2e-admin-fabrik'`)[0].status).toBe("hidden");
  await page.goto(`/kataloq?city=${CITY.slug}`);
  await expect(cards(page)).toHaveCount(0);
});

test("upload route: signed out → 401; foreign or missing Origin → 403; too large → 413; an image → 201 { id, variants }", async ({ page, request, baseURL }) => {
  const file = { name: "sample.jpg", mimeType: "image/jpeg", buffer: await readFile(SAMPLE) };
  const signedOut = await request.post("/api/admin/media", { multipart: { file }, headers: { origin: baseURL! }, maxRedirects: 0 });
  expect(signedOut.status()).toBe(401);

  await loginAsAdmin(page); // page.request shares the admin session cookie
  expect((await page.request.post("/api/admin/media", { multipart: { file }, headers: { origin: "https://evil.example" } })).status()).toBe(403);
  expect((await page.request.post("/api/admin/media", { multipart: { file } })).status()).toBe(403); // no Origin
  const huge = { name: "big.jpg", mimeType: "image/jpeg", buffer: Buffer.alloc(8 * 1024 * 1024 + 100 * 1024) };
  const tooLarge = await page.request.post("/api/admin/media", { multipart: { file: huge }, headers: { origin: baseURL! } });
  expect(tooLarge.status()).toBe(413);
  expect(await tooLarge.json()).toEqual({ error: "size" });

  const ok = await page.request.post("/api/admin/media", { multipart: { file }, headers: { origin: baseURL! } });
  expect(ok.status()).toBe(201);
  const body = (await ok.json()) as { id: string; variants: number[] };
  expect(body.id).toMatch(UUID);
  seenMedia.add(body.id); // not used by any factory: afterAll removes it
  expect(body.variants).toEqual([320, 640, 960]);
  expect((await request.get(`/media/${body.id}/640.webp`)).status()).toBe(200);
});

test("factory list: name search treats % and _ literally; type and status filters", async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto(`/admin/factories?q=${encodeURIComponent("E2E Admin")}&status=hidden`);
  await expect(page.getByRole("link", { name: FACTORY })).toBeVisible();
  await page.goto(`/admin/factories?q=${encodeURIComponent("E2E_Admin")}`);
  await expect(page.getByText("Zavod tapılmadı.")).toBeVisible();
  await page.goto(`/admin/factories?q=${encodeURIComponent("%")}&type=fabrik`);
  await expect(page.getByText("Zavod tapılmadı.")).toBeVisible();
  await page.goto(`/admin/factories?q=${encodeURIComponent("E2E Admin")}&type=zavod`);
  await expect(page.getByText("Zavod tapılmadı.")).toBeVisible();
});

test("a city used by a factory cannot be deleted", async ({ page }) => {
  await loginAsAdmin(page);
  await gotoHydrated(page, "/admin/dictionaries/cities");
  await page.getByRole("button", { name: `Sil: ${CITY.name}` }).click();
  await page.getByRole("button", { name: "Bəli, sil" }).click();
  // (Next.js adds its own route announcer, also role="alert".)
  await expect(page.getByRole("alert").filter({ hasText: "zavodda" })).toHaveText("Bu dəyər 1 zavodda istifadə olunur");
  expect(await sql`select 1 from dict_cities where slug = ${CITY.slug}`).toHaveLength(1);
});
