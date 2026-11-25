import { createHash } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import postgres from "postgres";
import { gotoHydrated, loginAsAdmin } from "./db";

// Rating modal (step 3, Task 5). R1: own rows with the "e2e-fr" prefix.
const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
const SLUG = "e2e-fr";
const DRAFT = "e2e-fr-draft";
const URL = `/fabrik/${SLUG}`;
const ids: string[] = [];

test.use({ viewport: { width: 1440, height: 900 } });

async function invalidate(tags: string[]) {
  const now = Date.now();
  for (const tag of tags) {
    await sql`insert into cache_tags (tag, expired_at) values (${tag}, ${now}) on conflict (tag) do update set expired_at = excluded.expired_at`;
  }
}

test.beforeAll(async () => {
  test.setTimeout(60_000);
  await sql`delete from factories where slug like 'e2e-fr%'`;
  for (const [slug, status] of [[SLUG, "published"], [DRAFT, "draft"]] as const) {
    const [f] = await sql<{ id: string }[]>`insert into factories ${sql({ type: "fabrik", slug, name: `E2E ${slug}`, status })} returning id`;
    ids.push(f.id);
  }
  await invalidate(["factories", ...ids.map((id) => `factory:${id}`)]);
  await new Promise((r) => setTimeout(r, 3_500));
});

test.beforeEach(async () => {
  await sql`delete from ratings where factory_id = any(${ids}::uuid[])`;
  await sql`update factories set rating_avg = 0, rating_count = 0 where id = any(${ids}::uuid[])`;
  await sql`delete from rate_limits`;
});

test.afterAll(async () => {
  await sql`delete from factories where slug like 'e2e-fr%'`;
  await sql`delete from rate_limits`;
  await invalidate(["factories", ...ids.map((id) => `factory:${id}`)]);
  await sql.end();
});

const openButton = (page: Page) => page.getByRole("button", { name: "Qiymətləndir" });
const dialog = (page: Page) => page.getByRole("dialog", { name: "Fabriki qiymətləndirin" });
const thanks = (page: Page) => page.getByRole("dialog", { name: "Təşəkkür edirik!" });
const star = (page: Page, n: number) => page.getByRole("radio", { name: `${n} ulduz` });
const choose = (page: Page, n: number) => page.locator("label", { has: star(page, n) }).click();
const confirm = (page: Page) => page.getByRole("button", { name: "Təsdiqlə" });
const stored = async () => (await sql<{ avg: number; count: number }[]>`select rating_avg as avg, rating_count as count from factories where slug = ${SLUG}`)[0];

test("modal flow: lazy chunk, disabled confirm, choose, thanks, rating saved and shown", async ({ page }) => {
  await gotoHydrated(page, URL);
  const scripts: string[] = [];
  page.on("request", (r) => {
    if (/\.js(\?|$)/.test(r.url())) scripts.push(r.url());
  });
  await expect(dialog(page)).toHaveCount(0);

  await openButton(page).click();
  await expect(dialog(page)).toBeVisible();
  expect(scripts.length, "the dialog chunk is requested on the click").toBeGreaterThan(0);
  await expect(page.getByRole("radio")).toHaveCount(5);
  await expect(confirm(page)).toBeDisabled();

  await choose(page, 4);
  await expect(star(page, 4)).toBeChecked();
  await expect(confirm(page)).toBeEnabled();
  await confirm(page).click();

  await expect(thanks(page)).toBeVisible();
  await expect(page.getByText("Rəy bildirdiyiniz üçün minnətdarıq.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Ana səhifəyə" })).toHaveAttribute("href", "/");
  expect(await stored()).toEqual({ avg: 4, count: 1 });

  await page.getByRole("button", { name: "Bağla" }).click();
  await expect(thanks(page)).toHaveCount(0);
  // The factory page tag was refreshed at once: the header shows the new rating.
  await expect(page.getByText("4.0", { exact: true })).toBeVisible();
});

test("keyboard: arrow keys move the radio group, Escape closes, focus returns to the button", async ({ page }) => {
  await gotoHydrated(page, URL);
  await openButton(page).focus();
  await page.keyboard.press("Enter");
  await expect(dialog(page)).toBeVisible();
  await star(page, 1).focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(star(page, 3)).toBeChecked();
  await expect(star(page, 3)).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(star(page, 2)).toBeChecked();
  await page.keyboard.press("Escape");
  await expect(dialog(page)).toHaveCount(0);
  await expect(openButton(page)).toBeFocused();
  expect(await stored()).toEqual({ avg: 0, count: 0 });
});

test("a changed vote: the earlier score is preselected, the vote is replaced, not added", async ({ page }) => {
  await gotoHydrated(page, URL);
  await openButton(page).click();
  await choose(page, 2);
  await confirm(page).click();
  await expect(thanks(page)).toBeVisible();
  expect(await stored()).toEqual({ avg: 2, count: 1 });
  await page.getByRole("button", { name: "Bağla" }).click();

  await openButton(page).click();
  await expect(star(page, 2)).toBeChecked();
  await choose(page, 5);
  await confirm(page).click();
  await expect(thanks(page)).toBeVisible();
  expect(await stored()).toEqual({ avg: 5, count: 1 });
  expect(await sql`select 1 from ratings where factory_id = ${ids[0]}`).toHaveLength(1);
});

test("a second voter adds to the average", async ({ browser }) => {
  for (const score of [2, 5]) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await gotoHydrated(page, URL);
    await openButton(page).click();
    await choose(page, score);
    await confirm(page).click();
    await expect(thanks(page)).toBeVisible();
    await context.close();
  }
  expect(await stored()).toEqual({ avg: 3.5, count: 2 });
});

test("limit: after 20 votes from one IP in an hour the dialog shows the error in Azerbaijani", async ({ browser }) => {
  const ip = "203.0.113.77";
  const key = `rate:${createHash("sha256").update(`${process.env.IP_HASH_SALT}:${ip}`).digest("hex").slice(0, 32)}`;
  await sql`insert into rate_limits (key, window_start, count) values (${key}, now(), 20)`;
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, extraHTTPHeaders: { "x-forwarded-for": ip } });
  const page = await context.newPage();
  await gotoHydrated(page, URL);
  await openButton(page).click();
  await choose(page, 3);
  await confirm(page).click();
  await expect(page.locator("p[role=alert]")).toHaveText("Çox səs verildi. Bir az sonra yenidən yoxlayın.");
  await expect(dialog(page)).toBeVisible();
  expect(await stored()).toEqual({ avg: 0, count: 0 });
  await context.close();
});

test("one IP: the 4th distinct voter is refused in Azerbaijani, a changed vote of an earlier voter still works", async ({ browser }) => {
  const ip = "203.0.113.88";
  const contexts = [];
  for (let i = 0; i < 4; i++) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, extraHTTPHeaders: { "x-forwarded-for": ip } });
    contexts.push(context);
    const page = await context.newPage();
    await gotoHydrated(page, URL);
    await openButton(page).click();
    await choose(page, 3);
    await confirm(page).click();
    if (i < 3) await expect(thanks(page)).toBeVisible();
    else {
      await expect(page.locator("p[role=alert]")).toHaveText("Bu zavod üçün sizin şəbəkənizdən artıq bir neçə səs verilib. Daha səs qəbul edilmir.");
      await expect(thanks(page)).toHaveCount(0);
    }
  }
  expect(await stored()).toEqual({ avg: 3, count: 3 });
  expect((await sql`select ip_hash from ratings where factory_id = ${ids[0]}`).every((r) => r.ip_hash)).toBe(true);
  // The first voter changes the vote: allowed.
  const first = contexts[0].pages()[0];
  await first.reload();
  await openButton(first).click();
  await choose(first, 5);
  await confirm(first).click();
  await expect(thanks(first)).toBeVisible();
  expect(await stored()).toEqual({ avg: 3.67, count: 3 });
  for (const c of contexts) await c.close();
});

test("an unpublished factory cannot be rated", async ({ page }) => {
  await loginAsAdmin(page);
  await gotoHydrated(page, `/fabrik/${DRAFT}?preview=1`);
  await openButton(page).click();
  await choose(page, 4);
  await confirm(page).click();
  await expect(page.locator("p[role=alert]")).toHaveText("Bu zavod qiymətləndirilə bilməz.");
  expect(await sql`select 1 from ratings where factory_id = ${ids[1]}`).toHaveLength(0);
});

test("other languages and mobile: English labels; on a phone the dialog is a sheet on the bottom edge", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await context.newPage();
  await gotoHydrated(page, `/en/factory/${SLUG}`);
  await page.getByRole("button", { name: "Rate" }).click();
  const box = page.getByRole("dialog", { name: "Rate the factory" });
  await expect(box).toBeVisible();
  const rect = await box.boundingBox();
  expect(rect!.width).toBe(375);
  expect(Math.round(rect!.y + rect!.height)).toBe(812);
  await expect(page.getByRole("button", { name: "Close" })).toBeHidden();
  await expect(page.getByRole("radio", { name: "3 star(s)" })).toBeAttached();
  await context.close();
});

test("the dialog chunk cannot load: the button says so and the page keeps working", async ({ page }) => {
  await gotoHydrated(page, URL);
  await page.route(/\.js(\?|$)/, (route) => route.abort());
  await openButton(page).click();
  await expect(page.locator("p[role=alert]")).toHaveText("Pəncərəni açmaq mümkün olmadı, yenidən cəhd edin.");
  await expect(dialog(page)).toHaveCount(0);
});
