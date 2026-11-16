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

test("a rejected body says why (unsafe link) and nothing is saved", async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto("/admin/pages/terms");
  // The editor never produces such a link (same rule as the server), so the request is altered on the way.
  const bad = JSON.stringify({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "x", marks: [{ type: "link", attrs: { href: "https:zavod.az" } }] }] }] });
  await page.route("**/admin/pages/terms", async (route) => {
    // Server action payload: form fields are sent as multipart parts named "_<n>_body.az".
    const body = route.request().postData();
    const field = /(name="(?:_?\d+_)?body\.az"\r\n\r\n)[^\r]*/;
    if (route.request().method() !== "POST" || !body || !field.test(body)) return route.continue();
    await route.continue({ postData: body.replace(field, (_, head: string) => head + bad) });
  });
  await page.getByRole("button", { name: "Yadda saxla" }).click();
  await expect(page.locator("form").getByRole("alert")).toHaveText("Məzmun (AZ): Link yalnız https://, http:// və ya mailto: ilə başlaya bilər");
  await expect(page.getByText("Yadda saxlanıldı")).toBeHidden();
});

test("the editor refuses a link the server would reject", async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto("/admin/pages/terms");
  const messages: string[] = [];
  page.on("dialog", async (d) => {
    messages.push(d.message());
    if (d.type() === "prompt") await d.accept("https:zavod.az");
    else await d.accept();
  });
  await page.locator('[data-editor="body-az"] [contenteditable="true"]').click();
  await page.keyboard.press("Control+A");
  await page.getByRole("button", { name: "Link", exact: true }).click();
  await expect.poll(() => messages.length).toBe(2);
  expect(messages[1]).toBe("Yalnız https://, http:// və ya mailto: ünvanlarına icazə verilir.");
  await expect(page.locator('[data-editor="body-az"] a')).toHaveCount(0);
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
