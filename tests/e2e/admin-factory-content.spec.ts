import { expect, test, type Page } from "@playwright/test";
import { access, rm } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";
import { gotoHydrated, loginAsAdmin, resetRateLimits } from "./db";

// R1: own rows only (slug prefix "e2e-fc"). Content of one factory: logo + contact fields, gallery (max 6, reorder),
// certificates, PDF catalogues, products, slug change → redirects, signed-out access.
const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
const uploadDir = path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads"));
const NAME = "E2E FC Fabrik";
const SLUG = "e2e-fc-fabrik";
const NEW_SLUG = "e2e-fc-yeni";
const SAMPLE = "tests/fixtures/sample.jpg";
const PDF = Buffer.from("%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n");
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/;
const YT = "dQw4w9WgXcQ";

const seenMedia = new Set<string>();
const exists = (p: string) => access(p).then(() => true, () => false);
const mediaRow = async (id: string) => (await sql`select 1 from media where id = ${id}`).length === 1;

async function cleanup() {
  if (!/@(localhost|127\.0\.0\.1)[:/]/.test(process.env.DATABASE_URL ?? "")) throw new Error("local database only");
  const rows = await sql<{ id: string }[]>`
    select media_id as id from factory_images where factory_id in (select id from factories where slug like 'e2e-fc%')
    union select media_id from factory_certificates where factory_id in (select id from factories where slug like 'e2e-fc%')
    union select media_id from factory_files where factory_id in (select id from factories where slug like 'e2e-fc%')
    union select media_id from product_images where product_id in (select id from products where factory_id in (select id from factories where slug like 'e2e-fc%'))
    union select logo_id from factories where slug like 'e2e-fc%' and logo_id is not null
    union select cover_id from factories where slug like 'e2e-fc%' and cover_id is not null`;
  for (const r of rows) seenMedia.add(r.id);
  await sql`delete from factories where slug like 'e2e-fc%'`; // cascades to the content rows
  for (const id of seenMedia) {
    await sql`delete from media where id = ${id}`;
    await rm(path.join(uploadDir, id), { recursive: true, force: true });
  }
  await sql`delete from redirects where from_path like '%/e2e-fc%'`;
  const now = Date.now();
  await sql`insert into cache_tags (tag, expired_at) values ('factories', ${now}), ('redirects', ${now})
    on conflict (tag) do update set expired_at = excluded.expired_at`;
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

const factoryId = async () => (await sql<{ id: string }[]>`select id from factories where slug in (${SLUG}, ${NEW_SLUG})`)[0]?.id;
const galleryIds = async (id: string) => (await sql<{ media_id: string }[]>`select media_id from factory_images where factory_id = ${id} order by sort, media_id`).map((r) => r.media_id);
const productGallery = async (code: number) => (await sql<{ media_id: string }[]>`select media_id from product_images where product_id = ${code} order by sort, media_id`).map((r) => r.media_id);

/** Picks a file in the upload field of the page and waits until the form has the media id. */
async function pickAndAdd(page: Page, label: RegExp, submit: string, file: Parameters<ReturnType<Page["getByLabel"]>["setInputFiles"]>[0] = SAMPLE) {
  await page.getByLabel(label).setInputFiles(file);
  await expect(page.getByText("Fayl yükləndi")).toBeVisible();
  await page.getByRole("button", { name: submit }).click();
}

/**
 * What a browser without JavaScript does with a server-action form: takes the form from the server-rendered HTML
 * (the one that contains every string of `match`) and posts its hidden fields as multipart/form-data to the page URL.
 * (A hydrated page cannot be used: React replaces the form action; and the admin panel streams its content behind
 * Suspense, which needs JS to be revealed, so a JS-less browser page cannot be driven here.)
 */
async function plainFormPost(page: Page, url: string, match: string[]) {
  const html = await (await page.request.get(url)).text();
  const form = (html.match(/<form[\s\S]*?<\/form>/g) ?? []).find((f) => match.every((m) => f.includes(m)));
  expect(form, `form with ${match.join(", ")}`).toBeTruthy();
  const fields: Record<string, string> = {};
  for (const input of form!.match(/<input[^>]*>/g) ?? []) {
    const name = /name="([^"]*)"/.exec(input)?.[1];
    if (name) fields[name] = /value="([^"]*)"/.exec(input)?.[1] ?? "";
  }
  expect(Object.keys(fields).some((k) => k.startsWith("$ACTION_ID_"))).toBe(true);
  const res = await page.request.post(url, { multipart: fields, headers: { origin: new URL(page.url()).origin } });
  expect(res.status()).toBe(200);
}

test("signed out: every new section redirects to /admin/login", async ({ page }) => {
  const id = "00000000-0000-4000-8000-000000000000";
  for (const section of ["images", "certificates", "files", "products", "products/new", "products/1000000"]) {
    await page.goto(`/admin/factories/${id}/${section}`);
    await expect(page, section).toHaveURL(/\/admin\/login/);
  }
});

test("factory: logo and all contact / content fields are saved, values stay on error, a bad YouTube link is refused", async ({ page }) => {
  test.setTimeout(90_000);
  await loginAsAdmin(page);
  await gotoHydrated(page, "/admin/factories/new");
  await page.getByLabel("Tip", { exact: true }).selectOption("fabrik");
  await page.getByLabel("Ad", { exact: true }).fill(NAME);
  await page.getByLabel(/^Slug/).fill(SLUG);
  await page.getByLabel("Status", { exact: true }).selectOption("published");
  await page.getByRole("button", { name: "Yadda saxla" }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/factories/${UUID.source}\\?saved=1$`));
  const editUrl = page.url().replace(/\?.*$/, "");
  await gotoHydrated(page, editUrl);

  await page.getByLabel("Hüquqi ad", { exact: true }).fill("E2E FC Fabrik MMC");
  await page.getByLabel("İşçi sayı", { exact: true }).fill("250");
  await page.getByLabel("İstehsal gücü", { exact: true }).fill("5 000 ton / il");
  await page.getByLabel("Avadanlıq və texniki imkanlar", { exact: true }).fill("CNC dəzgah\nLazer kəsmə");
  await page.getByLabel("Telefon", { exact: true }).fill("+994 50 123 45 67");
  await page.getByLabel("E-poçt", { exact: true }).fill("info@e2e-fc.test");
  await page.getByLabel("Sayt", { exact: true }).fill("https://e2e-fc.test");
  await page.getByLabel("Ünvan", { exact: true }).fill("Bakı, Sumqayıt yolu 5");
  await page.getByLabel("YouTube linki", { exact: true }).fill("https://vimeo.com/123");
  await page.getByLabel("Facebook", { exact: true }).fill("https://facebook.com/e2efc");
  await page.getByLabel("Instagram", { exact: true }).fill("instagram.com/e2efc"); // no scheme: refused
  await page.getByLabel(/^Loqo/).setInputFiles(SAMPLE);
  await expect(page.getByRole("img", { name: "Yeni loqo" })).toBeVisible();
  await page.getByRole("button", { name: "Yadda saxla" }).click();
  await expect(page.getByText("Yalnız youtube.com və ya youtu.be linki")).toBeVisible();
  await expect(page.getByText("https:// ilə başlayan link yazın")).toBeVisible();
  // Nothing typed is lost, the uploaded logo is still attached.
  await expect(page.getByLabel("Hüquqi ad", { exact: true })).toHaveValue("E2E FC Fabrik MMC");
  await expect(page.getByLabel("Avadanlıq və texniki imkanlar", { exact: true })).toHaveValue("CNC dəzgah\nLazer kəsmə");
  await expect(page.getByLabel("YouTube linki", { exact: true })).toHaveValue("https://vimeo.com/123");
  await expect(page.getByRole("img", { name: "Yeni loqo" })).toBeVisible();

  await page.getByLabel("YouTube linki", { exact: true }).fill(`https://youtu.be/${YT}?si=abc`);
  await page.getByLabel("Instagram", { exact: true }).fill("https://instagram.com/e2efc");
  await page.getByRole("button", { name: "Yadda saxla" }).click();
  await expect(page.getByRole("status")).toHaveText("Yadda saxlanıldı");
  await expect(page.getByRole("img", { name: "Mövcud loqo" })).toBeVisible();

  const [row] = await sql<Record<string, unknown>[]>`select legal_name, employee_count, capacity_text, equipment_text, phone, email, website, address, youtube_url, socials, logo_id from factories where slug = ${SLUG}`;
  expect(row).toMatchObject({
    legal_name: "E2E FC Fabrik MMC",
    employee_count: 250,
    capacity_text: "5 000 ton / il",
    equipment_text: "CNC dəzgah\nLazer kəsmə",
    phone: "+994 50 123 45 67",
    email: "info@e2e-fc.test",
    website: "https://e2e-fc.test",
    address: "Bakı, Sumqayıt yolu 5",
    youtube_url: `https://www.youtube.com/watch?v=${YT}`,
    socials: { facebook: "https://facebook.com/e2efc", instagram: "https://instagram.com/e2efc" },
  });
  const logo = row.logo_id as string;
  expect(logo).toMatch(UUID);
  seenMedia.add(logo);

  // A fresh load shows the stored values; "Loqonu sil" removes the logo with its files.
  await gotoHydrated(page, editUrl);
  await expect(page.getByLabel("İşçi sayı", { exact: true })).toHaveValue("250");
  await expect(page.getByLabel("YouTube linki", { exact: true })).toHaveValue(`https://www.youtube.com/watch?v=${YT}`);
  await expect(page.getByLabel("Facebook", { exact: true })).toHaveValue("https://facebook.com/e2efc");
  await page.getByLabel("Loqonu sil").check();
  await page.getByRole("button", { name: "Yadda saxla" }).click();
  await expect(page.getByRole("status")).toHaveText("Yadda saxlanıldı");
  await expect(page.getByRole("img", { name: "Mövcud loqo" })).toHaveCount(0);
  expect(await mediaRow(logo)).toBe(false);
  expect(await exists(path.join(uploadDir, logo))).toBe(false);
});

test("gallery: capped at 6 (also against a stale form), reorder works as a plain form post, delete removes the files", async ({ page }) => {
  test.setTimeout(150_000);
  await loginAsAdmin(page);
  const id = (await factoryId())!;
  const url = `/admin/factories/${id}/images`;
  await gotoHydrated(page, url);
  for (let n = 1; n <= 5; n++) {
    await pickAndAdd(page, /^Yeni şəkil/, "Şəkil əlavə et");
    await expect(page.getByText(`${n}/6 şəkil`)).toBeVisible();
  }
  // A second tab adds the sixth image while this form (loaded with five) is still open.
  await page.getByLabel(/^Yeni şəkil/).setInputFiles(SAMPLE);
  await expect(page.getByText("Fayl yükləndi")).toBeVisible();
  const other = await page.context().newPage();
  await gotoHydrated(other, url);
  await pickAndAdd(other, /^Yeni şəkil/, "Şəkil əlavə et");
  await expect(other.getByText("6/6 şəkil")).toBeVisible();
  await other.close();
  const before = await galleryIds(id);
  expect(before).toHaveLength(6);
  const seenBefore = await sql<{ id: string }[]>`select id from media where created_at > now() - interval '2 minutes'`;
  await page.getByRole("button", { name: "Şəkil əlavə et" }).click();
  await expect(page.getByText("Ən çox 6 şəkil əlavə etmək olar")).toBeVisible();
  expect(await galleryIds(id)).toEqual(before);
  // The refused upload did not stay behind as an orphan.
  const seenAfter = await sql<{ id: string }[]>`select id from media where created_at > now() - interval '2 minutes'`;
  const orphan = seenAfter.filter((m) => !seenBefore.some((b) => b.id === m.id));
  expect(orphan).toHaveLength(0);
  const leftover = await sql<{ id: string }[]>`select id from media m where created_at > now() - interval '5 minutes' and not exists (select 1 from factory_images f where f.media_id = m.id) and kind = 'image' and not exists (select 1 from factories x where x.cover_id = m.id or x.logo_id = m.id)`;
  for (const m of leftover) seenMedia.add(m.id);

  // Reordering with JavaScript turned off: plain form posts.
  await page.reload();
  await expect(page.getByText("6/6 şəkil")).toBeVisible();
  await expect(page.getByRole("button", { name: "Şəkil 1: yuxarı" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Şəkil 6: aşağı" })).toBeDisabled();
  await plainFormPost(page, url, [`value="${before[1]}"`, 'value="up"']);
  expect(await galleryIds(id)).toEqual([before[1], before[0], ...before.slice(2)]);
  await plainFormPost(page, url, [`value="${before[4]}"`, 'value="down"']);
  expect(await galleryIds(id)).toEqual([before[1], before[0], before[2], before[3], before[5], before[4]]);
  await page.reload();
  await expect(page.getByRole("img", { name: "Şəkil 1" })).toHaveAttribute("src", new RegExp(before[1]));

  // Delete removes the row, the media row and the files; the form to add one is back.
  await page.reload();
  await page.getByRole("button", { name: "Şəkil 1: sil" }).click();
  await expect(page.getByText("5/6 şəkil")).toBeVisible();
  expect(await mediaRow(before[1])).toBe(false);
  expect(await exists(path.join(uploadDir, before[1]))).toBe(false);
  expect(await galleryIds(id)).toEqual([before[0], before[2], before[3], before[5], before[4]]);
  await expect(page.getByLabel(/^Yeni şəkil/)).toBeVisible();
});


test("certificates: title + image; an empty title is refused; delete removes the files", async ({ page }) => {
  test.setTimeout(60_000);
  await loginAsAdmin(page);
  const id = (await factoryId())!;
  await gotoHydrated(page, `/admin/factories/${id}/certificates`);
  await page.getByLabel(/^Sertifikat şəkli/).setInputFiles(SAMPLE);
  await expect(page.getByText("Fayl yükləndi")).toBeVisible();
  await page.getByRole("button", { name: "Sertifikat əlavə et" }).click();
  await expect(page.getByText("Başlıq məcburidir")).toBeVisible();
  expect(await sql`select 1 from factory_certificates where factory_id = ${id}`).toHaveLength(0);

  await page.getByLabel("Sertifikatın adı").fill("ISO 9001");
  await page.getByRole("button", { name: "Sertifikat əlavə et" }).click();
  await expect(page.getByRole("img", { name: "ISO 9001" })).toBeVisible();
  const [cert] = await sql<{ media_id: string; title: string }[]>`select media_id, title from factory_certificates where factory_id = ${id}`;
  expect(cert.title).toBe("ISO 9001");
  seenMedia.add(cert.media_id);

  await page.getByRole("button", { name: "Sil: ISO 9001" }).click();
  await expect(page.getByText("Sertifikat yoxdur.")).toBeVisible();
  expect(await mediaRow(cert.media_id)).toBe(false);
  expect(await exists(path.join(uploadDir, cert.media_id))).toBe(false);
});

test("PDF catalogues: a PDF is added and opens inline; a non-PDF is refused; delete removes the file", async ({ page, request }) => {
  test.setTimeout(60_000);
  await loginAsAdmin(page);
  const id = (await factoryId())!;
  await gotoHydrated(page, `/admin/factories/${id}/files`);
  await page.getByLabel("Kataloqun adı").fill("Kataloq 2026");
  await page.getByRole("button", { name: "Kataloq əlavə et" }).click();
  await expect(page.getByText("PDF faylını seçin")).toBeVisible();

  // An image is refused in the browser, a fake PDF by the server (content decides).
  await page.getByLabel(/^PDF faylı/).setInputFiles({ name: "x.jpg", mimeType: "image/jpeg", buffer: Buffer.from("x") });
  await expect(page.getByText("Yalnız PDF faylı")).toBeVisible();
  await page.getByLabel(/^PDF faylı/).setInputFiles({ name: "fake.pdf", mimeType: "application/pdf", buffer: Buffer.from("şəkil deyil, PDF də deyil") });
  await expect(page.getByText("Yalnız PDF faylı")).toBeVisible();
  await expect(page.getByText("Fayl yükləndi")).toHaveCount(0);
  expect(await sql`select 1 from factory_files where factory_id = ${id}`).toHaveLength(0);

  await pickAndAdd(page, /^PDF faylı/, "Kataloq əlavə et", { name: "kataloq.pdf", mimeType: "application/pdf", buffer: PDF });
  const link = page.getByRole("link", { name: "Kataloq 2026" });
  await expect(link).toBeVisible();
  const [file] = await sql<{ media_id: string; title: string; size: number }[]>`select f.media_id, f.title, m.size from factory_files f join media m on m.id = f.media_id where f.factory_id = ${id}`;
  expect(file.size).toBe(PDF.length);
  seenMedia.add(file.media_id);
  await expect(link).toHaveAttribute("href", `/media/${file.media_id}/file.pdf`);
  const served = await request.get(`/media/${file.media_id}/file.pdf`);
  expect(served.status()).toBe(200);
  expect(served.headers()["content-disposition"]).toBe("inline; filename=katalog.pdf");

  await page.getByRole("button", { name: "Sil: Kataloq 2026" }).click();
  await expect(page.getByText("PDF kataloq yoxdur.")).toBeVisible();
  expect(await mediaRow(file.media_id)).toBe(false);
  expect(await exists(path.join(uploadDir, file.media_id))).toBe(false);
});

test("products: create, edit, images (max 6, reorder), delete removes the images", async ({ page }) => {
  test.setTimeout(150_000);
  await loginAsAdmin(page);
  const id = (await factoryId())!;
  await gotoHydrated(page, `/admin/factories/${id}/products`);
  await expect(page.getByText("Məhsul yoxdur.")).toBeVisible();
  await page.getByRole("link", { name: "Yeni məhsul" }).click();
  await expect(page).toHaveURL(/\/products\/new$/);

  // Errors keep the typed values.
  await gotoHydrated(page, `/admin/factories/${id}/products/new`);
  await page.getByLabel("Məhsulun adı").fill("P");
  await page.getByLabel("Təsvir").fill("Qısa təsvir");
  await page.getByRole("button", { name: "Yadda saxla" }).click();
  await expect(page.getByText("Ən azı 2 simvol")).toBeVisible();
  await expect(page.getByLabel("Təsvir")).toHaveValue("Qısa təsvir");

  await page.getByLabel("Məhsulun adı").fill("Polad boru");
  await page.getByLabel("Məhsulun statusu").selectOption("published");
  await page.getByRole("button", { name: "Yadda saxla" }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/factories/${id}/products/[1-9]\\d{6,}\\?saved=1$`));
  const code = Number(page.url().match(/products\/(\d+)\?/)![1]);
  expect(code).toBeGreaterThanOrEqual(1_000_000);
  const [p] = await sql<{ slug: string; name: string; status: string }[]>`select slug, name, status from products where id = ${code}`;
  expect(p).toEqual({ slug: "polad-boru", name: "Polad boru", status: "published" });

  // Edit: new name and description (counter), status to draft.
  const editUrl = `/admin/factories/${id}/products/${code}`;
  await gotoHydrated(page, editUrl);
  await page.getByLabel("Məhsulun adı").fill("Qalın polad boru");
  await page.getByLabel("Təsvir").fill("a".repeat(400));
  await expect(page.getByText("400/400")).toBeVisible();
  await page.getByLabel("Məhsulun statusu").selectOption("draft");
  await page.getByRole("button", { name: "Yadda saxla" }).click();
  await expect(page.getByRole("status")).toHaveText("Yadda saxlanıldı");
  const [edited] = await sql<{ slug: string; description: string; status: string }[]>`select slug, description, status from products where id = ${code}`;
  expect(edited).toEqual({ slug: "qalin-polad-boru", description: "a".repeat(400), status: "draft" });

  // Images: up to 6.
  await gotoHydrated(page, editUrl);
  for (let n = 1; n <= 6; n++) {
    await pickAndAdd(page, /^Yeni şəkil/, "Şəkil əlavə et");
    await expect(page.getByText(`${n}/6 şəkil`)).toBeVisible();
  }
  await expect(page.getByLabel(/^Yeni şəkil/)).toHaveCount(0);
  const imgs = await productGallery(code);
  expect(imgs).toHaveLength(6);
  for (const m of imgs) seenMedia.add(m);

  await plainFormPost(page, editUrl, [`value="${imgs[2]}"`, 'value="up"']);
  expect(await productGallery(code)).toEqual([imgs[0], imgs[2], imgs[1], ...imgs.slice(3)]);

  await page.reload();
  await page.getByRole("button", { name: "Şəkil 1: sil" }).click();
  await expect(page.getByText("5/6 şəkil")).toBeVisible();
  expect(await mediaRow(imgs[0])).toBe(false);
  expect(await exists(path.join(uploadDir, imgs[0]))).toBe(false);

  // The list shows it; deleting the product removes its remaining images.
  await gotoHydrated(page, `/admin/factories/${id}/products`);
  await expect(page.getByRole("link", { name: "Qalın polad boru" })).toBeVisible();
  await expect(page.getByRole("cell", { name: String(code) })).toBeVisible();
  await gotoHydrated(page, editUrl);
  await page.getByRole("button", { name: "Məhsulu sil" }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/factories/${id}/products\\?deleted=1$`));
  await expect(page.getByText("Məhsul yoxdur.")).toBeVisible();
  expect(await sql`select 1 from products where id = ${code}`).toHaveLength(0);
  for (const m of imgs) {
    expect(await mediaRow(m), m).toBe(false);
    expect(await exists(path.join(uploadDir, m)), m).toBe(false);
  }
});

test("slug change writes redirects and invalidates the factory, factories and redirects tags; status change does too; preview link", async ({ page }) => {
  test.setTimeout(60_000);
  await loginAsAdmin(page);
  const id = (await factoryId())!;
  const editUrl = `/admin/factories/${id}`;
  await gotoHydrated(page, editUrl);
  await expect(page.getByRole("link", { name: "Önizlə" })).toHaveAttribute("href", `/fabrik/${SLUG}?preview=1`);

  const started = Date.now();
  await page.getByLabel(/^Slug/).fill(NEW_SLUG);
  await page.getByRole("button", { name: "Yadda saxla" }).click();
  await expect(page.getByRole("status")).toHaveText("Yadda saxlanıldı");
  const redirects = await sql<{ from_path: string; to_path: string }[]>`select from_path, to_path from redirects where from_path like '%/e2e-fc-fabrik%' order by from_path`;
  expect(redirects).toHaveLength(15); // 3 languages × (factory + 4 tabs)
  expect(redirects).toContainEqual({ from_path: `/fabrik/${SLUG}`, to_path: `/fabrik/${NEW_SLUG}` });
  expect(redirects).toContainEqual({ from_path: `/en/factory/${SLUG}/products`, to_path: `/en/factory/${NEW_SLUG}/products` });
  expect(redirects).toContainEqual({ from_path: `/ru/fabrika/${SLUG}/vozmozhnosti`, to_path: `/ru/fabrika/${NEW_SLUG}/vozmozhnosti` });
  await expect(page.getByRole("link", { name: "Önizlə" })).toHaveAttribute("href", `/fabrik/${NEW_SLUG}?preview=1`);

  const stamp = async (tag: string) => Number((await sql<{ expired_at: string }[]>`select expired_at from cache_tags where tag = ${tag}`)[0]?.expired_at ?? 0);
  for (const tag of [`factory:${id}`, "factories", "redirects"]) expect(await stamp(tag), tag).toBeGreaterThanOrEqual(started);

  // A status change alone also drops all three.
  const second = Date.now();
  await page.getByLabel("Status", { exact: true }).selectOption("hidden");
  await page.getByRole("button", { name: "Yadda saxla" }).click();
  await expect(page.getByRole("status")).toHaveText("Yadda saxlanıldı");
  for (const tag of [`factory:${id}`, "factories", "redirects"]) expect(await stamp(tag), tag).toBeGreaterThanOrEqual(second);
  expect((await sql<{ status: string }[]>`select status from factories where id = ${id}`)[0].status).toBe("hidden");
});
