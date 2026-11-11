import { expect, test } from "@playwright/test";

test.describe("desktop", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("header has the main menu and contacts", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Əsas menyu" });
    for (const label of ["Ana səhifə", "Xəbərlər", "Kataloq", "Tariflər", "Vakansiyalar", "Əlaqə"]) {
      await expect(nav.getByRole("link", { name: label })).toBeVisible();
    }
    await expect(page.getByRole("link", { name: "+994 000 00 00" }).first()).toHaveAttribute("href", "tel:+9940000000");
    await expect(page.getByRole("link", { name: "Birbaşa Whatsapp-a yazın" }).first()).toHaveAttribute(
      "href",
      "https://wa.me/994000000000",
    );
  });

  test("language switcher keeps the page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Dil: Az" }).click();
    await page.getByRole("link", { name: "En" }).click();
    await expect(page).toHaveURL(/\/en$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("navigation", { name: "Main menu" }).getByRole("link", { name: "Catalog" })).toBeVisible();
  });

  test("footer shows contacts, socials and legal links", async ({ page }) => {
    await page.goto("/");
    const footer = page.locator("footer");
    await expect(footer.getByText("Lorem ipsum street 00, AZ 000")).toBeVisible();
    await expect(footer.getByRole("link", { name: "İstifadəçi qaydaları" })).toHaveAttribute("href", "/istifadeci-qaydalari");
    await expect(footer.getByRole("link", { name: "Facebook" })).toBeVisible();
    await expect(footer.getByText("©Bütün hüquqlar qorunur. Zavod.az, 2025")).toBeVisible();
  });
});

test.describe("mobile", () => {
  test.use({ viewport: { width: 320, height: 568 } });

  test("menu opens, closes with Escape, and has no horizontal scroll", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Menyunu aç" }).click();
    const menu = page.getByRole("dialog");
    await expect(menu.getByRole("link", { name: "Vakansiyalar" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    expect(overflow).toBe(0);
  });

  test("menu switches language", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Menyunu aç" }).click();
    await page.getByRole("dialog").getByRole("link", { name: "Ru" }).click();
    await expect(page).toHaveURL(/\/ru$/);
  });
});
