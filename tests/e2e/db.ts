import { expect, type Page } from "@playwright/test";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { max: 1 });

/** Local database only — refuses anything that is not localhost. */
function assertLocal() {
  if (!/@(localhost|127\.0\.0\.1)[:/]/.test(process.env.DATABASE_URL ?? "")) {
    throw new Error("E2E helpers only run against a local database");
  }
}

export async function resetRateLimits() {
  assertLocal();
  await sql`delete from rate_limits`;
}

/**
 * Opens a page and waits until React has hydrated it (the <main> element carries a React fiber).
 * Typing into an uncontrolled field before hydration races React: hydration puts the server value back
 * under Playwright's edit (seen: fill("") on "admin@zavod.test" left "dmin@zavod.test", which was valid
 * and got saved into the shared settings).
 */
export async function gotoHydrated(page: Page, url: string) {
  await page.goto(url);
  await expect
    .poll(() => page.locator("main").first().evaluate((el) => Object.keys(el).some((k) => k.startsWith("__reactFiber$"))))
    .toBe(true);
}

export async function loginAsAdmin(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("E-mail").fill(process.env.ADMIN_EMAIL!);
  await page.getByLabel("Şifrə").fill(process.env.ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Daxil ol" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

// ---------- Catalog page fixture (R1: own city, slug prefix "e2e-", assertions go through ?city=e2e-city) ----------

export const E2E_CITY = "e2e-city";

/**
 * Marks the catalog cache tags as expired in `cache_tags`; the server applies it on its next tag sync
 * (src/lib/cache/tag-sync.ts, every 3 s), so we wait one interval.
 */
async function invalidateCatalogCache() {
  const now = Date.now();
  await sql`
    insert into cache_tags (tag, expired_at) values ('dictionaries', ${now}), ('factories', ${now})
    on conflict (tag) do update set expired_at = excluded.expired_at`;
  await new Promise((r) => setTimeout(r, 3_500));
}

/**
 * City "e2e-city" with 16 published factories (2 pages) and one draft:
 * order VIP fabrik → Premium zavod → verified fabrik → 13 sex fillers (newest first).
 * The VIP one is the oldest, so it is first only because of its tariff.
 */
export async function seedCatalogFixture() {
  assertLocal();
  await deleteCatalogFixture();
  const [city] = await sql<{ id: number }[]>`
    insert into dict_cities (slug, name, sort)
    values (${E2E_CITY}, ${sql.json({ az: "E2E şəhər", en: "E2E city", ru: "E2E город" })}, 9001) returning id`;
  const at = (minute: number) => new Date(Date.UTC(2026, 0, 1, 12, minute));
  const row = (slug: string, name: string, type: string, minute: number, extra: Partial<{ tariff_code: string; tariff_rank: number; verified: boolean; status: string }> = {}) => ({
    slug,
    name,
    about: `${name} haqqında`,
    type,
    city_id: city.id,
    status: "published",
    tariff_code: "standart",
    tariff_rank: 0,
    verified: false,
    created_at: at(minute),
    ...extra,
  });
  const rows = [
    row("e2e-vip", "E2E VIP Fabrik", "fabrik", 1, { tariff_code: "vip", tariff_rank: 2 }),
    row("e2e-premium", "E2E Premium Zavod", "zavod", 2, { tariff_code: "premium", tariff_rank: 1 }),
    row("e2e-fabrik", "E2E Fabrik", "fabrik", 3, { verified: true }),
    ...Array.from({ length: 13 }, (_, i) => row(`e2e-sex-${String(i + 1).padStart(2, "0")}`, `E2E Sex ${i + 1}`, "sex", 10 + i)),
    row("e2e-draft", "E2E Draft", "fabrik", 40, { tariff_code: "vip", tariff_rank: 2, status: "draft" }),
  ];
  await sql`insert into factories ${sql(rows)}`;
  await invalidateCatalogCache();
}

async function deleteCatalogFixture() {
  // "e2e-q-*" rows only ever exist inside the rolled-back DB test (R9); this removes page-level rows.
  await sql`delete from factories where slug like 'e2e-%'`;
  await sql`delete from dict_cities where slug = ${E2E_CITY}`;
}

export async function clearCatalogFixture() {
  assertLocal();
  await deleteCatalogFixture();
  await invalidateCatalogCache();
}
