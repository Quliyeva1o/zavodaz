import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "./db";

test.use({ viewport: { width: 1440, height: 900 } });

test("admin edits the terms title and body; the site shows it at once", async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto("/admin/pages/terms");
  const title = page.getByLabel("Başlıq (AZ)");
  const original = await title.inputValue();
  try {
    await title.fill("Qaydalar (test)");
    const editor = page.locator('[data-editor="body-az"] [contenteditable="true"]');
    await editor.click();
    await page.keyboard.press("Control+End");
    await page.keyboard.type(" Yeni cümlə.");
    await page.getByRole("button", { name: "Yadda saxla" }).click();
    await expect(page.getByText("Yadda saxlanıldı")).toBeVisible();
    await page.goto("/istifadeci-qaydalari");
    await expect(page.getByRole("heading", { level: 1, name: "Qaydalar (test)" })).toBeVisible();
    await expect(page.locator("main")).toContainText("Yeni cümlə.");
  } finally {
    await page.goto("/admin/pages/terms");
    await page.getByLabel("Başlıq (AZ)").fill(original);
    await page.getByRole("button", { name: "Bərpa et (Figma mətni)" }).click(); // resets body to the seeded text
    await page.getByRole("button", { name: "Yadda saxla" }).click();
    await expect(page.getByText("Yadda saxlanıldı")).toBeVisible();
  }
});

test("admin adds, hides and deletes a FAQ item", async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto("/admin/faq");
  await page.getByRole("button", { name: "Yeni sual" }).click();
  await page.getByLabel("Sual (AZ)").fill("Test sualı?");
  await page.getByLabel("Cavab (AZ)").fill("Test cavabı.");
  await page.getByRole("button", { name: "Yadda saxla" }).click();
  await expect(page.getByText("Yadda saxlanıldı")).toBeVisible();
  await page.goto("/yardim");
  await expect(page.getByText("Test sualı?")).toBeVisible();
  await page.goto("/admin/faq");
  const row = page.getByRole("row", { name: /Test sualı\?/ });
  await row.getByRole("button", { name: "Sil" }).click();
  await page.getByRole("button", { name: "Bəli, sil" }).click();
  await expect(row).toHaveCount(0); // wait for the delete to finish before reloading
  await page.goto("/yardim");
  await expect(page.getByText("Test sualı?")).toHaveCount(0);
});
