import { expect, test, type Page } from "@playwright/test";
import { E2E_CITY, clearCatalogFixture, seedCatalogFixture } from "./db";

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
const types = async (page: Page) => (await cards(page).locator("span.uppercase").allTextContents()).map((t) => t.trim());

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
  expect(await types(page)).toEqual(["Fabrik", "Fabrik"]);
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
  expect(await types(page)).toEqual(["Fabrik", "Fabrik"]);
  await context.close();
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
    await dialog.getByRole("checkbox", { name: "Zavod" }).click();
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
      scripts.push({ when: phase, hit: res.text().then((t) => t.includes(marker)).catch(() => false) });
    });
    await page.goto("/kataloq");
    await page.waitForLoadState("networkidle");
    phase = "after";
    await page.getByRole("button", { name: "Filtr", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    const before = await Promise.all(scripts.filter((s) => s.when === "before").map((s) => s.hit));
    const after = await Promise.all(scripts.filter((s) => s.when === "after").map((s) => s.hit));
    expect(before.some(Boolean)).toBe(false);
    expect(after.some(Boolean)).toBe(true);
  });
});
