import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "./db";

test.use({ viewport: { width: 1440, height: 900 } });

test("admin changes the phone and the header shows it at once", async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto("/admin/settings");
  await page.getByLabel("Telefon", { exact: true }).fill("+994 12 555 55 55");
  await page.getByRole("button", { name: "Yadda saxla" }).click();
  await expect(page.getByText("Yadda saxlanıldı")).toBeVisible();

  await page.goto("/");
  await expect(page.locator("header").getByRole("link", { name: "+994 12 555 55 55" })).toBeVisible();

  // Restore the Figma default so the visual test keeps matching.
  await page.goto("/admin/settings");
  await page.getByLabel("Telefon", { exact: true }).fill("+994 000 00 00");
  await page.getByRole("button", { name: "Yadda saxla" }).click();
  await expect(page.getByText("Yadda saxlanıldı")).toBeVisible();
});

test("invalid email is rejected with a message", async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto("/admin/settings");
  await page.getByLabel("E-mail").fill("yanlış");
  await page.getByRole("button", { name: "Yadda saxla" }).click();
  await expect(page.getByText("E-mail düzgün deyil")).toBeVisible();
});
