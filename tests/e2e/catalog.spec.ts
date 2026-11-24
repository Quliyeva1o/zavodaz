import { expect, test, type Page } from "@playwright/test";
import { E2E_CITY, E2E_INDUSTRY, clearCatalogFixture, gotoHydrated, seedCatalogFixture } from "./db";

// R1: the dev DB may hold other factories (Figma fixture), so every assertion goes through ?city=e2e-city.
test.use({ viewport: { width: 1440, height: 900 } });
test.beforeAll(async () => {
  test.setTimeout(30_000);
  await seedCatalogFixture();
});
test.afterAll(async () => {
  test.setTimeout(30_000);
  await clearCatalogFixture();
});

const CITY = `?city=${E2E_CITY}`;
const cards = (page: Page) => page.locator("main article");
const cardNames = (page: Page) => cards(page).locator("h3").allTextContents();
/** Factory types of the cards (FactoryCard's `data-type` hook; the visible label is uppercased by CSS). */
const types = (page: Page) => cards(page).evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.type));

test("/kataloq: 200, h1, cards; the VIP factory comes first in the default order; 15 per page", async ({ page }) => {
  const res = await page.goto("/kataloq");
  expect(res?.status()).toBe(200);
  await expect(page.locator("h1")).toHaveText("Kataloq");
  await expect(cards(page).first()).toBeVisible();

  await page.goto(`/kataloq${CITY}`);
  await expect(cards(page)).toHaveCount(15);
  expect((await cardNames(page)).slice(0, 3)).toEqual(["E2E VIP Fabrik", "E2E Premium Zavod", "E2E Fabrik"]);
  expect(await cardNames(page)).not.toContain("E2E Draft");
  await expect(cards(page).first().getByRole("link")).toHaveAttribute("href", "/fabrik/e2e-vip");

  // Pagination keeps the filter; page 2 holds the 16th factory.
  await page.getByRole("navigation", { name: "Səhifələmə" }).getByRole("link", { name: "Səhifə 2" }).click();
  await expect(page).toHaveURL(`/kataloq${CITY}&page=2`);
  await expect(cards(page)).toHaveCount(1);
});

test("type checkbox → ?type=fabrik, only fabrik cards; 'Hamısı' clears the types; reset link goes to the base", async ({ page }) => {
  await page.goto(`/kataloq${CITY}`);
  await expect(page.getByRole("link", { name: "Filtri sıfırla" })).toBeVisible();
  await page.getByRole("checkbox", { name: "Fabrik" }).check();
  await expect(page).toHaveURL(`/kataloq?type=fabrik&city=${E2E_CITY}`);
  await expect(cards(page)).toHaveCount(2);
  expect(await types(page)).toEqual(["fabrik", "fabrik"]);
  await expect(page.getByRole("checkbox", { name: "Hamısı" })).not.toBeChecked();

  await page.getByRole("checkbox", { name: "Hamısı" }).check();
  await expect(page).toHaveURL(`/kataloq${CITY}`);
  await expect(page.getByRole("checkbox", { name: "Fabrik" })).not.toBeChecked();

  await page.getByRole("link", { name: "Filtri sıfırla" }).click();
  await expect(page).toHaveURL("/kataloq");
  await expect(page.getByRole("link", { name: "Filtri sıfırla" })).toHaveCount(0);
  await expect(page.getByRole("combobox", { name: "Şəhər / Region" })).toHaveText("Hamısı");
});

test("city dropdown → ?city=e2e-city; sort radio → ?sort=…", async ({ page }) => {
  await page.goto("/kataloq");
  await page.getByRole("combobox", { name: "Şəhər / Region" }).click();
  await page.getByRole("option", { name: "E2E şəhər" }).click();
  await expect(page).toHaveURL(`/kataloq${CITY}`);
  await expect(cards(page)).toHaveCount(15);
  await expect(page.getByRole("combobox", { name: "Şəhər / Region" })).toHaveText("E2E şəhər");

  await page.getByRole("radio", { name: "Aşağı reytinqlilər öndə" }).check();
  await expect(page).toHaveURL(`/kataloq${CITY}&sort=rating_asc`);
});

test("without JavaScript the <noscript> button submits the same filter", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(`/kataloq${CITY}`);
  await page.getByRole("checkbox", { name: "Fabrik" }).check();
  await page.getByRole("button", { name: "Tətbiq et" }).click();
  await page.waitForURL(/type=fabrik/);
  const url = new URL(page.url());
  expect(url.searchParams.getAll("type")).toEqual(["fabrik"]);
  expect(url.searchParams.get("city")).toBe(E2E_CITY);
  await expect(cards(page)).toHaveCount(2);
  expect(await types(page)).toEqual(["fabrik", "fabrik"]);
  await context.close();
});

test("without JavaScript the dropdowns are native selects: city → ?city=…", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto("/kataloq");
  // The JS combobox box is hidden; the native <select> carries the value.
  await expect(page.locator("#f-city")).toBeHidden();
  await page.getByRole("combobox", { name: "Şəhər / Region" }).selectOption({ label: "E2E şəhər" });
  await page.getByRole("button", { name: "Tətbiq et" }).click();
  await page.waitForURL(/city=/);
  const url = new URL(page.url());
  expect(url.pathname).toBe("/kataloq");
  expect(url.searchParams.getAll("city")).toEqual([E2E_CITY]);
  await expect(cards(page)).toHaveCount(15);
  await expect(page.getByRole("combobox", { name: "Şəhər / Region" })).toHaveValue(E2E_CITY);
  await context.close();
});

test("radio arrow keys navigate once (debounced), with JS", async ({ page }) => {
  await page.goto(`/kataloq${CITY}`);
  const navigations: string[] = [];
  page.on("request", (r) => r.isNavigationRequest() || r.headers()["rsc"] ? navigations.push(r.url()) : undefined);
  await page.getByRole("radio", { name: "Hamısı" }).last().focus();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await expect(page).toHaveURL(`/kataloq${CITY}&sort=rating_asc`);
  expect(navigations.filter((u) => u.includes("sort=rating_desc"))).toEqual([]);
});

test("SEO: filtered URLs are noindex, follow with the base canonical; ?page=2 is its own canonical; JSON-LD", async ({ page }) => {
  await page.goto(`/kataloq${CITY}`);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, follow");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/kataloq$/);

  await page.goto("/kataloq?page=2");
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/kataloq\?page=2$/);

  await page.goto(`/kataloq${CITY}`);
  const ld = (await page.locator('script[type="application/ld+json"]').allTextContents()).map((s) => JSON.parse(s));
  const list = ld.find((d) => d["@type"] === "ItemList");
  expect(list.itemListElement[0]).toMatchObject({ position: 1, url: expect.stringMatching(/\/fabrik\/e2e-vip$/) });
  expect(ld.some((d) => d["@type"] === "BreadcrumbList")).toBe(true);
});

test("?page past the last page shows not-found (noindex)", async ({ page }) => {
  // Cache Components commits the response (status 200) before a request-time check runs, so notFound() from
  // searchParams cannot set 404 (node_modules/next/dist/docs/01-app/02-guides/streaming.md, "The HTTP contract";
  // measured: 200 also with the blocking render). The page shows not-found and Next adds noindex.
  // A real 404 needs Proxy (controller decision).
  await page.goto(`/kataloq${CITY}&page=999`);
  await expect(page.getByRole("heading", { name: "Səhifə tapılmadı" })).toBeVisible();
  await expect(cards(page)).toHaveCount(0);
  await expect(page.locator('meta[name="robots"][content*="noindex"]').first()).toBeAttached();
});

test("/en/catalog: English heading, filter and factory links", async ({ page }) => {
  const res = await page.goto(`/en/catalog${CITY}`);
  expect(res?.status()).toBe(200);
  await expect(page.locator("h1")).toHaveText("Catalog");
  await expect(page.getByRole("heading", { name: "Filter", exact: true })).toBeVisible();
  await expect(cards(page).first().getByRole("link")).toHaveAttribute("href", "/en/factory/e2e-vip");
});

test("mobile: title, Filter button and cards in one column", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto(`/kataloq${CITY}`);
  const button = page.getByRole("button", { name: "Filtr", exact: true });
  await expect(button).toBeVisible();
  expect(await button.boundingBox()).toMatchObject({ width: 288, height: 40 });
  const [a, b] = await Promise.all([cards(page).nth(0).boundingBox(), cards(page).nth(1).boundingBox()]);
  expect(a!.width).toBe(288);
  expect(b!.y - (a!.y + a!.height)).toBe(16);
});

test.describe("mobile filter dialog (Figma Mob/Filtr)", () => {
  test.use({ viewport: { width: 320, height: 568 } });

  const open = async (page: Page, path = "/kataloq") => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const button = page.getByRole("button", { name: "Filtr", exact: true });
    await button.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    return { button, dialog };
  };

  test("opens with 7 rows; choosing a value navigates and returns to the list; multi-select types; reset", async ({ page }) => {
    const { dialog } = await open(page);
    await expect(dialog).toHaveAttribute("aria-modal", "true");
    await expect(dialog.getByRole("button", { name: /^(İstehsalın tipi|İstehsal sahəsi|Şəhər \/ Region|Məhsul tipi|İstehsalat Modeli|Əməkdaşlıq imkanı|Reytinqinə görə)$/ })).toHaveCount(7);
    await expect(dialog.getByRole("heading", { name: "Filtr" })).toBeFocused();

    await dialog.getByRole("button", { name: "Şəhər / Region" }).click();
    await expect(dialog.getByRole("radio", { name: "Hamısı" })).toHaveAttribute("aria-checked", "true");
    await dialog.getByRole("radio", { name: "Bakı" }).click();
    await expect(page).toHaveURL("/kataloq?city=baki");
    // Back on the list screen, dialog still open.
    await expect(dialog.getByRole("button", { name: "Şəhər / Region" })).toBeVisible();

    await dialog.getByRole("button", { name: "İstehsalın tipi" }).click();
    await dialog.getByRole("checkbox", { name: "Sex" }).click();
    await expect(page).toHaveURL("/kataloq?type=sex&city=baki");
    // Two taps without waiting for the server in between: neither is lost, both boxes tick at once.
    await dialog.getByRole("checkbox", { name: "Zavod" }).click();
    await dialog.getByRole("checkbox", { name: "Fabrik" }).click();
    await expect(dialog.getByRole("checkbox", { name: "Fabrik" })).toHaveAttribute("aria-checked", "true");
    await expect(page).toHaveURL("/kataloq?type=zavod&type=fabrik&type=sex&city=baki");
    await dialog.getByRole("checkbox", { name: "Fabrik" }).click();
    await expect(page).toHaveURL("/kataloq?type=zavod&type=sex&city=baki");
    await expect(dialog.getByRole("checkbox", { name: "Zavod" })).toHaveAttribute("aria-checked", "true");
    await expect(dialog).toBeVisible();

    // The back arrow leaves the option screen; reset clears everything.
    await dialog.getByRole("button", { name: "Geri" }).click();
    await dialog.getByRole("button", { name: "Filtri sıfırla" }).click();
    await expect(page).toHaveURL("/kataloq");
  });

  test("Escape closes the dialog and focus returns to the Filter button; the back arrow closes from the list", async ({ page }) => {
    const { button, dialog } = await open(page);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(button).toBeFocused();

    await button.click();
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Geri" }).click();
    await expect(dialog).toBeHidden();
    await expect(button).toBeFocused();
  });

  test("the dialog chunk is not loaded with the page, only after the button click", async ({ page }) => {
    const marker = "data-mobile-filter";
    const scripts: { when: "before" | "after"; hit: Promise<boolean> }[] = [];
    let phase: "before" | "after" = "before";
    page.on("response", (res) => {
      if (res.request().resourceType() !== "script") return;
      scripts.push({ when: phase, hit: res.text().then((t) => t.includes(marker)) });
    });
    await page.goto("/kataloq");
    await page.waitForLoadState("networkidle");
    phase = "after";
    await page.getByRole("button", { name: "Filtr", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    const before = await Promise.all(scripts.filter((s) => s.when === "before").map((s) => s.hit));
    const after = await Promise.all(scripts.filter((s) => s.when === "after").map((s) => s.hit));
    expect(before.length).toBeGreaterThan(0);
    expect(before.some(Boolean)).toBe(false);
    expect(after.some(Boolean)).toBe(true);
  });
});

// ---------- Task 9: type pages, recommended, landings, sitemap ----------

const crumbItems = (page: Page) => page.getByRole("navigation", { name: "Naviqasiya" }).first().locator(":scope > span");

test("/fabrikler: h1 'Fabriklər', 2-step breadcrumb, only fabrik cards", async ({ page }) => {
  const res = await page.goto(`/fabrikler${CITY}`);
  expect(res?.status()).toBe(200);
  await expect(page.locator("h1")).toHaveText("Fabriklər");
  await expect(crumbItems(page)).toHaveText(["Ana səhifə", "Fabriklər"]);
  await expect(cards(page)).toHaveCount(2);
  expect(await types(page)).toEqual(["fabrik", "fabrik"]);
});

test("/en/factories: English heading", async ({ page }) => {
  await page.goto(`/en/factories${CITY}`);
  await expect(page.locator("h1")).toHaveText("Factories");
  await expect(cards(page).first().getByRole("link")).toHaveAttribute("href", "/en/factory/e2e-vip");
});

test("landing /fabrikler/e2e-city: h1, 3-step breadcrumb, canonical + hreflang, indexable", async ({ page }) => {
  const res = await page.goto(`/fabrikler/${E2E_CITY}`);
  expect(res?.status()).toBe(200);
  await expect(page.locator("h1")).toHaveText("Fabriklər — E2E şəhər");
  await expect(crumbItems(page)).toHaveText(["Ana səhifə", "Fabriklər", "E2E şəhər"]);
  await expect(page.getByRole("navigation", { name: "Naviqasiya" }).first().getByRole("link", { name: "Fabriklər" })).toHaveAttribute("href", "/fabrikler");
  const ld = (await page.locator('script[type="application/ld+json"]').allTextContents()).map((x) => JSON.parse(x));
  const bc = ld.find((d) => d["@type"] === "BreadcrumbList");
  expect(bc.itemListElement.map((i: { name: string }) => i.name)).toEqual(["Ana səhifə", "Fabriklər", "E2E şəhər"]);
  await expect(cards(page)).toHaveCount(2);
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`/fabrikler/${E2E_CITY}$`));
  await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute("href", new RegExp(`/en/factories/${E2E_CITY}$`));
  // The landing's own city dropdown is not offered.
  await expect(page.getByRole("combobox", { name: "Şəhər / Region" })).toHaveCount(0);
});

test("industry landing /fabrikler/e2e-industry", async ({ page }) => {
  await page.goto(`/fabrikler/${E2E_INDUSTRY}`);
  await expect(page.locator("h1")).toHaveText("Fabriklər — E2E sahə");
  await expect(cards(page)).toHaveCount(1);
  await expect(page.getByRole("combobox", { name: "İstehsal sahəsi" })).toHaveCount(0);
});

test("empty landing (no such type in the city): 200, noindex, empty state", async ({ page }) => {
  const res = await page.goto(`/aqroparklar/${E2E_CITY}`);
  expect(res?.status()).toBe(200);
  await expect(page.locator("h1")).toHaveText("Aqroparklar — E2E şəhər");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, follow");
  await expect(cards(page)).toHaveCount(0);
  await expect(page.getByText("Seçilmiş filtrlərə uyğun nəticə tapılmadı")).toBeVisible();
});

test("unknown type segment is a real 404; unknown landing slug is a soft 404 (200 + not-found + noindex, R11/R12)", async ({ request, page }) => {
  expect((await request.get("/yox-bele-tip")).status()).toBe(404);
  // Cache Components commits status 200 before the page can call notFound() (same as ?page past the end);
  // a real 404 would need a dictionary lookup in the proxy on every request.
  expect((await request.get("/fabrikler/yox-bele-yer")).status()).toBe(200);
  await page.goto("/fabrikler/yox-bele-yer");
  await expect(page.getByRole("heading", { name: "Səhifə tapılmadı" })).toBeVisible();
  await expect(cards(page)).toHaveCount(0);
  await expect(page.locator('meta[name="robots"][content*="noindex"]').first()).toBeAttached();
});

test("type page: page past the last page is a soft 404 (noindex)", async ({ page }) => {
  await page.goto(`/fabrikler${CITY}&page=999`);
  await expect(page.getByRole("heading", { name: "Səhifə tapılmadı" })).toBeVisible();
  await expect(page.locator('meta[name="robots"][content*="noindex"]').first()).toBeAttached();
});

test("recommended: only Premium/VIP factories (through ?city)", async ({ page }) => {
  const res = await page.goto(`/kataloq/tovsiyye-edilenler${CITY}`);
  expect(res?.status()).toBe(200);
  await expect(page.locator("h1")).toHaveText("Tövsiyə edilənlər");
  expect(await cardNames(page)).toEqual(["E2E VIP Fabrik", "E2E Premium Zavod"]);
  await expect(crumbItems(page)).toHaveText(["Ana səhifə", "Tövsiyə edilənlər"]);
  await page.goto("/en/catalog/recommended");
  await expect(page.locator("h1")).toHaveText("Recommended");
});

test("type page: changing the type leaves it for /kataloq?type=…", async ({ page }) => {
  await gotoHydrated(page, `/fabrikler${CITY}`);
  await expect(page.getByRole("checkbox", { name: "Fabrik" })).toBeChecked();
  await page.getByRole("checkbox", { name: "Sex" }).check();
  await expect(page).toHaveURL(`/kataloq?type=fabrik&type=sex&city=${E2E_CITY}`);
  // The type page stays mounted (hidden) behind the new route: count what is visible.
  await expect(page.locator("main article:visible")).toHaveCount(15);
});

test("landing page: changing a filter moves to /kataloq and keeps type + landing city", async ({ page }) => {
  await gotoHydrated(page, `/fabrikler/${E2E_CITY}`);
  await page.getByRole("radio", { name: "Aşağı reytinqlilər öndə" }).check();
  await expect(page).toHaveURL(`/kataloq?type=fabrik&city=${E2E_CITY}&sort=rating_asc`);
  await expect(page.locator("main article:visible")).toHaveCount(2);
});

test("mobile filter on a type page offers the type group and leaves for /kataloq", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto(`/fabrikler${CITY}`);
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Filtr", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "İstehsalın tipi" }).click();
  await expect(dialog.getByRole("checkbox", { name: "Fabrik" })).toHaveAttribute("aria-checked", "true");
  await dialog.getByRole("checkbox", { name: "Sex" }).click();
  await expect(page).toHaveURL(`/kataloq?type=fabrik&type=sex&city=${E2E_CITY}`);
});

test("sitemap: catalog, recommended, 6 types, non-empty landings in 3 languages with hreflang; no empty landings", async ({ request }) => {
  const xml = await (await request.get("/sitemap.xml")).text();
  const locs = [...xml.matchAll(/<loc>https?:\/\/[^/<]+(\/[^<]*)<\/loc>/g)].map((m) => m[1]);
  for (const p of ["/kataloq", "/en/catalog", "/ru/katalog", "/kataloq/tovsiyye-edilenler", "/en/catalog/recommended", "/ru/katalog/rekomenduemye", "/zavodlar", "/en/plants", "/ru/zavody", "/ru/cekhi", "/aqroparklar", "/en/agroparks"]) {
    expect(locs, p).toContain(p);
  }
  for (const p of [`/fabrikler/${E2E_CITY}`, `/en/factories/${E2E_CITY}`, `/ru/fabriki/${E2E_CITY}`, `/fabrikler/${E2E_INDUSTRY}`, `/zavodlar/${E2E_CITY}`]) {
    expect(locs, p).toContain(p);
  }
  expect(locs).not.toContain(`/aqroparklar/${E2E_CITY}`);
  expect(locs).not.toContain(`/kombinatlar/${E2E_CITY}`);
  const entry = xml.split("<url>").find((e) => e.includes(`/fabrikler/${E2E_CITY}</loc>`)) ?? "";
  expect(entry).toContain(`/ru/fabriki/${E2E_CITY}"`);
  expect(entry).toContain('hreflang="x-default"');
});
