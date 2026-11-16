import { expect, test } from "@playwright/test";
import postgres from "postgres";
import { loginAsAdmin } from "./db";

const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
test.afterAll(() => sql.end());
test.afterEach(async () => {
  await sql`delete from rate_limits`;
});
test.use({ viewport: { width: 1440, height: 900 } });

test("admin changes the Premium price; the tariffs page shows it", async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto("/admin/tariffs");
  const price = page.getByLabel("Premium — aylıq qiymət (₼)");
  const original = await price.inputValue();
  try {
    await price.fill("8.49");
    await page.getByRole("button", { name: "Premium — yadda saxla" }).click();
    await expect(page.getByText("Yadda saxlanıldı")).toBeVisible();
    await page.goto("/tarifler");
    await expect(page.getByText("8.49₼")).toBeVisible();
  } finally {
    await page.goto("/admin/tariffs");
    await page.getByLabel("Premium — aylıq qiymət (₼)").fill(original);
    await page.getByRole("button", { name: "Premium — yadda saxla" }).click();
    await expect(page.getByText("Yadda saxlanıldı")).toBeVisible();
  }
});

test("an invalid price keeps the typed values and shows the error", async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto("/admin/tariffs");
  await page.getByLabel("Premium — aylıq qiymət (₼)").fill("abc");
  await page.getByRole("button", { name: "Premium — yadda saxla" }).click();
  await expect(page.getByText("Qiymət formatı: 7.99").first()).toBeVisible();
  await expect(page.getByLabel("Premium — aylıq qiymət (₼)")).toHaveValue("abc");
});

test("notify email gets the contact message (Mailpit) and admin sees it unread", async ({ page, request }) => {
  await loginAsAdmin(page);
  await page.goto("/admin/contact");
  const originalEmails = await page.getByLabel("Bildiriş e-mailləri").inputValue();
  await page.getByLabel("Bildiriş e-mailləri").fill("admin@zavod.test");
  try {
    await page.getByRole("button", { name: "Yadda saxla" }).click();
    await expect(page.getByText("Yadda saxlanıldı")).toBeVisible();

    await request.delete("http://localhost:8027/api/v1/messages");
    const email = `mail-${Date.now()}@test.az`;
    await page.goto("/elaqe");
    await page.getByLabel("Adınız", { exact: true }).fill("Rəşad");
    await page.getByLabel("Soyadınız").fill("Əliyev");
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Nömrə").fill("+994 55 000 00 00");
    await page.getByRole("combobox", { name: "Mövzu" }).click();
    await page.getByRole("option", { name: "Əməkdaşlıq" }).click();
    await page.getByLabel("Mesajınız").fill("Əməkdaşlıq təklifi");
    await page.waitForTimeout(3100);
    await page.getByRole("button", { name: "Müraciət et" }).click();
    await expect(page.getByRole("dialog")).toContainText("Qəbul olundu!");

    // The email is sent after the response (after()), so poll Mailpit.
    await expect
      .poll(async () => (await (await request.get("http://localhost:8027/api/v1/messages")).json()).total, { timeout: 10_000 })
      .toBeGreaterThan(0);

    await page.goto("/admin/submissions");
    const row = page.getByRole("row", { name: new RegExp(email) });
    await expect(row).toContainText("Əməkdaşlıq");
    await expect(row.getByText("Yeni")).toBeVisible();
    await expect(page.getByRole("navigation").getByRole("link", { name: /Müraciətlər/ })).toContainText(/\d/);

    // Opening the row shows the message and marks it read.
    await row.click();
    await expect(page.getByText("Əməkdaşlıq təklifi")).toBeVisible();
    await expect(row.getByText("Oxunub")).toBeVisible();

    // Delete with confirmation.
    await page.getByRole("button", { name: "Sil" }).click();
    await page.getByRole("button", { name: "Bəli, sil" }).click();
    await expect(page.getByRole("row", { name: new RegExp(email) })).toHaveCount(0);
  } finally {
    await page.goto("/admin/contact");
    await page.getByLabel("Bildiriş e-mailləri").fill(originalEmails);
    await page.getByRole("button", { name: "Yadda saxla" }).click();
    await expect(page.getByText("Yadda saxlanıldı")).toBeVisible();
  }
});

test("a new topic keeps its generated id when renamed and saved again", async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto("/admin/contact");
  const n = Number(await page.locator('input[name="topics.count"]').inputValue()) + 1;
  const storedIds = async () =>
    (await sql`select value->'topics' as t from site_settings where key = 'contact'`)[0].t.map((x: { id: string }) => x.id) as string[];
  const save = async () => {
    await page.getByRole("button", { name: "Yadda saxla" }).click();
    await expect(page.getByText("Yadda saxlanıldı")).toBeVisible();
  };
  try {
    await page.getByRole("button", { name: "Mövzu əlavə et" }).click();
    await page.getByLabel(`Mövzu ${n} (AZ)`).fill("Sınaq mövzusu");
    await save();
    expect(await storedIds()).toContain("sinaq-movzusu");
    await page.getByLabel(`Mövzu ${n} (AZ)`).fill("Başqa ad");
    await page.getByRole("button", { name: "Yadda saxla" }).click();
    await expect.poll(async () => (await storedIds()).length).toBe(n);
    await expect
      .poll(async () => (await sql`select value->'topics' as t from site_settings where key = 'contact'`)[0].t[n - 1].label.az)
      .toBe("Başqa ad");
    const ids = await storedIds();
    expect(ids[n - 1]).toBe("sinaq-movzusu"); // renamed, id unchanged
    expect(new Set(ids).size).toBe(ids.length);
  } finally {
    await page.goto("/admin/contact");
    if (Number(await page.locator('input[name="topics.count"]').inputValue()) >= n) {
      await page.getByRole("button", { name: `Mövzu ${n} — sil` }).click();
      await page.getByRole("button", { name: "Yadda saxla" }).click();
      await expect(page.getByText("Yadda saxlanıldı")).toBeVisible();
    }
  }
});

test("contact settings reject an invalid notify email and keep the typed value", async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto("/admin/contact");
  await page.getByLabel("Bildiriş e-mailləri").fill("yanlis");
  await page.getByRole("button", { name: "Yadda saxla" }).click();
  await expect(page.getByText("E-mail düzgün deyil: yanlis")).toBeVisible();
  await expect(page.getByLabel("Bildiriş e-mailləri")).toHaveValue("yanlis");
});
