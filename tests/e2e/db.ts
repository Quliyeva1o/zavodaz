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

export async function loginAsAdmin(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("E-mail").fill(process.env.ADMIN_EMAIL!);
  await page.getByLabel("Şifrə").fill(process.env.ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Daxil ol" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}
