import { expect, test } from "@playwright/test";
import { loginAsAdmin, resetRateLimits } from "./db";

const email = process.env.ADMIN_EMAIL!;

test.afterEach(resetRateLimits);

test("signed-out visitor is sent to the login page", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test("wrong password shows an error", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Şifrə").fill("yanlis-sifre-123");
  await page.getByRole("button", { name: "Daxil ol" }).click();
  await expect(page.getByText("E-mail və ya şifrə yanlışdır")).toBeVisible();
});

test("five failed attempts lock the login for 15 minutes", async ({ page }) => {
  await page.goto("/admin/login");
  for (let i = 0; i < 5; i++) {
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Şifrə").fill(`yanlis-${i}`);
    // The error text is the same every time, so wait for the server action itself to finish.
    const done = page.waitForResponse((r) => r.request().method() === "POST");
    await page.getByRole("button", { name: "Daxil ol" }).click();
    await done;
    await expect(page.getByText("E-mail və ya şifrə yanlışdır")).toBeVisible();
    await expect(page.getByRole("button", { name: "Daxil ol" })).toBeEnabled();
  }
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Şifrə").fill(process.env.ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Daxil ol" }).click();
  await expect(page.getByText("Çox cəhd edildi. 15 dəqiqə sonra yenidən yoxlayın.")).toBeVisible();
});

test("admin signs in and out", async ({ page }) => {
  await loginAsAdmin(page);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await page.getByRole("button", { name: "Çıxış" }).click();
  await expect(page).toHaveURL(/\/admin\/login$/);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);
});
