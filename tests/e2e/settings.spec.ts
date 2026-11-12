import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "./db";

test.use({ viewport: { width: 1440, height: 900 } });

test("admin changes the phone and the header shows it at once", async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto("/admin/settings");
  const phone = page.getByLabel("Telefon", { exact: true });
  const original = await phone.inputValue();
  try {
    await phone.fill("+994 12 555 55 55");
    await page.getByRole("button", { name: "Yadda saxla" }).click();
    await expect(page.getByText("Yadda saxlanıldı")).toBeVisible();
    await expect(phone).toHaveValue("+994 12 555 55 55");

    await page.goto("/");
    await expect(page.locator("header").getByRole("link", { name: "+994 12 555 55 55" })).toBeVisible();
  } finally {
    // Restore the original (Figma default) so shared settings stay clean.
    await page.goto("/admin/settings");
    await page.getByLabel("Telefon", { exact: true }).fill(original);
    await page.getByRole("button", { name: "Yadda saxla" }).click();
    await expect(page.getByText("Yadda saxlanıldı")).toBeVisible();
  }
});

test("invalid email is rejected with a message", async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto("/admin/settings");
  await page.getByLabel("Telefon", { exact: true }).fill("+994 12 777 77 77");
  await page.getByLabel("E-mail").fill("yanlış");
  await page.getByRole("button", { name: "Yadda saxla" }).click();
  await expect(page.getByText("E-mail düzgün deyil")).toBeVisible();
  await expect(page.getByLabel("Telefon", { exact: true })).toHaveValue("+994 12 777 77 77");
  await expect(page.getByLabel("E-mail")).toHaveValue("yanlış");
});
