import { expect, test, type Page } from "@playwright/test";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
test.afterAll(() => sql.end());
test.afterEach(async () => {
  await sql`delete from rate_limits`;
});
test.use({ viewport: { width: 1440, height: 900 } });

// "Adınız" is also a substring of "Soyadınız", so that label is matched exactly.
async function fill(page: Page, email = "aysel@test.az") {
  await page.getByLabel("Adınız", { exact: true }).fill("Aysel");
  await page.getByLabel("Soyadınız").fill("Məmmədova");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Nömrə").fill("+994 50 123 45 67");
  await page.getByRole("combobox", { name: "Mövzu" }).click();
  await page.getByRole("option", { name: "Reklam" }).click();
  await page.getByLabel("Mesajınız").fill("Salam, reklam barədə məlumat istəyirəm.");
  await page.waitForTimeout(3100); // anti-bot timer
}

test("valid message is saved and the success dialog shows", async ({ page }) => {
  const email = `e2e-${Date.now()}@test.az`;
  await page.goto("/elaqe");
  await fill(page, email);
  await page.getByRole("button", { name: "Müraciət et" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("Qəbul olundu!");
  await expect(dialog.getByRole("link", { name: "Ana səhifəyə" })).toHaveAttribute("href", "/");
  const rows = await sql`select topic_id, topic_label, lang, first_name from contact_messages where email = ${email}`;
  expect(rows).toEqual([{ topic_id: "advertising", topic_label: "Reklam", lang: "az", first_name: "Aysel" }]);
  // Closing the dialog leaves an empty form behind.
  await dialog.getByRole("button", { name: "Bağla" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByLabel("Adınız", { exact: true })).toHaveValue("");
  await expect(page.getByRole("combobox", { name: "Mövzu" })).toContainText("Mövzunu seçin");
  await expect(page.getByText("0/200")).toBeVisible();
  await expect(page.getByLabel("Adınız", { exact: true })).toBeFocused();
});

test("invalid email keeps typed values and shows the field error", async ({ page }) => {
  await page.goto("/elaqe");
  await fill(page, "yanlis");
  await page.getByRole("button", { name: "Müraciət et" }).click();
  await expect(page.getByText("E-mail düzgün deyil")).toBeVisible();
  await expect(page.getByLabel("E-mail")).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByLabel("Adınız", { exact: true })).toHaveValue("Aysel");
  await expect(page.getByRole("combobox", { name: "Mövzu" })).toContainText("Reklam");
  await expect(page.getByText("39/200")).toBeVisible();
  await expect(page.getByRole("dialog")).toBeHidden();
});

test("character counter follows the message", async ({ page }) => {
  await page.goto("/elaqe");
  await expect(page.getByText("0/200")).toBeVisible();
  await page.getByLabel("Mesajınız").fill("Salam");
  await expect(page.getByText("5/200")).toBeVisible();
  await expect(page.getByLabel("Mesajınız")).toHaveAttribute("maxlength", "200");
});

test("a bot that submits instantly is silently ignored", async ({ page }) => {
  const email = `bot-${Date.now()}@test.az`;
  await page.goto("/elaqe");
  await page.getByLabel("Adınız", { exact: true }).fill("Bot");
  await page.getByLabel("Soyadınız").fill("Bot");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Nömrə").fill("+994 50 000 00 00");
  await page.getByRole("combobox", { name: "Mövzu" }).click();
  await page.getByRole("option", { name: "Digər" }).click();
  await page.getByLabel("Mesajınız").fill("spam");
  await page.getByRole("button", { name: "Müraciət et" }).click(); // < 3 s after load
  await expect(page.getByRole("dialog")).toContainText("Qəbul olundu!");
  expect(await sql`select 1 from contact_messages where email = ${email}`).toHaveLength(0);
});

test("topic dropdown works with the keyboard", async ({ page }) => {
  await page.goto("/elaqe");
  const trigger = page.getByRole("combobox", { name: "Mövzu" });
  await trigger.focus();
  await page.keyboard.press("ArrowDown");
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  const listbox = page.getByRole("listbox");
  await expect(listbox).toBeVisible();
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute("aria-required", "true");
  await page.keyboard.press("End"); // Digər
  await page.keyboard.press("ArrowUp"); // Reklam
  await page.keyboard.press("Enter");
  await expect(listbox).toBeHidden();
  await expect(trigger).toBeFocused();
  await expect(trigger).toContainText("Reklam");
  await expect(page.locator('input[name="topic"]')).toHaveValue("advertising");
  // Escape closes without changing the choice; a click outside closes too.
  await page.keyboard.press("Enter");
  await expect(listbox).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(listbox).toBeHidden();
  await trigger.click();
  await page.locator("h1").click();
  await expect(listbox).toBeHidden();
  await expect(page.locator('input[name="topic"]')).toHaveValue("advertising");
});

test("contact details and the WhatsApp link come from site settings; EN page is translated", async ({ page }) => {
  await page.goto("/elaqe");
  const main = page.locator("main");
  await expect(main.getByRole("heading", { level: 1 })).toHaveText("Əlaqə");
  await expect(main.getByRole("link", { name: /\+994/ })).toHaveAttribute("href", /^tel:\+994/);
  await expect(main.getByRole("link", { name: "youremailhere@partner.az" })).toHaveAttribute("href", "mailto:youremailhere@partner.az");
  await expect(main.getByRole("link", { name: "Birbaşa Whatsapp-a yazın" })).toHaveAttribute("href", /^https:\/\/wa\.me\/\d+$/);
  await expect(main.getByRole("link", { name: "Facebook" })).toBeVisible();

  await page.goto("/en/contact");
  await expect(page.getByLabel("First name")).toBeVisible();
  await expect(page.getByRole("button", { name: "Send" })).toBeVisible();
  await page.getByRole("combobox", { name: "Topic" }).click();
  await expect(page.getByRole("option", { name: "Advertising" })).toBeVisible();
});

test("a bot that fills the hidden honeypot field is silently ignored", async ({ page }) => {
  const email = `honeypot-${Date.now()}@test.az`;
  await page.goto("/elaqe");
  await fill(page, email); // waits past the 3 s timer, so only the honeypot catches it
  await page.locator("[name=website]").evaluate((el) => ((el as HTMLInputElement).value = "x"));
  await page.getByRole("button", { name: "Müraciət et" }).click();
  await expect(page.getByRole("dialog")).toContainText("Qəbul olundu!");
  expect(await sql`select 1 from contact_messages where email = ${email}`).toHaveLength(0);
});

test("the 6th valid message in an hour is refused and the typed values stay", async ({ page }) => {
  const first = `limit-a-${Date.now()}@test.az`;
  await page.goto("/elaqe");
  await fill(page, first);
  await page.getByRole("button", { name: "Müraciət et" }).click();
  await expect(page.getByRole("dialog")).toContainText("Qəbul olundu!");
  // Pretend the visitor has already sent 5 messages this hour.
  await sql`update rate_limits set count = 5 where key like 'contact:%'`;

  const sixth = `limit-b-${Date.now()}@test.az`;
  await page.goto("/elaqe");
  await fill(page, sixth);
  await page.getByRole("button", { name: "Müraciət et" }).click();
  await expect(page.locator("form").getByRole("alert")).toHaveText("Çox müraciət göndərildi. Bir az sonra yenidən yoxlayın.");
  await expect(page.getByLabel("E-mail")).toHaveValue(sixth);
  await expect(page.getByRole("combobox", { name: "Mövzu" })).toContainText("Reklam");
  await expect(page.getByRole("dialog")).toBeHidden();
  expect(await sql`select 1 from contact_messages where email = ${sixth}`).toHaveLength(0);
});

test("invalid submissions do not use up the hourly limit", async ({ page }) => {
  await page.goto("/elaqe");
  await fill(page, "yanlis");
  await page.getByRole("button", { name: "Müraciət et" }).click();
  await expect(page.getByText("E-mail düzgün deyil")).toBeVisible();
  expect(await sql`select 1 from rate_limits where key like 'contact:%'`).toHaveLength(0);
});

test("a message sent before the timer started gets a visible error, keeps the values and can be sent again", async ({ page }) => {
  // Date.now() is 0 while the page hydrates, so the form's start time stays 0 (as when the
  // submit happens before hydration).
  await page.addInitScript(() => {
    const real = Date.now.bind(Date);
    const w = window as unknown as { __zvFrozen?: boolean };
    w.__zvFrozen = true;
    Date.now = () => (w.__zvFrozen ? 0 : real());
  });
  const email = `notready-${Date.now()}@test.az`;
  await page.goto("/elaqe");
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => ((window as unknown as { __zvFrozen?: boolean }).__zvFrozen = false));
  await fill(page, email);
  await page.getByRole("button", { name: "Müraciət et" }).click();
  await expect(page.locator("form").getByRole("alert")).toHaveText("Forma hələ tam yüklənməmişdi. Zəhmət olmasa, yenidən göndərin.");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByLabel("E-mail")).toHaveValue(email);
  await expect(page.getByRole("combobox", { name: "Mövzu" })).toContainText("Reklam");
  expect(await sql`select 1 from contact_messages where email = ${email}`).toHaveLength(0);
  // Sending again right away is accepted: the visitor was typing all along.
  await page.getByRole("button", { name: "Müraciət et" }).click();
  await expect(page.getByRole("dialog")).toContainText("Qəbul olundu!");
  expect(await sql`select 1 from contact_messages where email = ${email}`).toHaveLength(1);
});

test("after a successful send the timer starts over for the next message", async ({ page }) => {
  const first = `again-a-${Date.now()}@test.az`;
  await page.goto("/elaqe");
  await fill(page, first);
  await page.getByRole("button", { name: "Müraciət et" }).click();
  await expect(page.getByRole("dialog")).toContainText("Qəbul olundu!");
  await page.getByRole("dialog").getByRole("button", { name: "Bağla" }).click();
  expect(await sql`select 1 from contact_messages where email = ${first}`).toHaveLength(1);

  // A second message right away (< 3 s after the first one) looks like a bot and is dropped silently.
  const second = `again-b-${Date.now()}@test.az`;
  await page.getByLabel("Adınız", { exact: true }).fill("Aysel");
  await page.getByLabel("Soyadınız").fill("Məmmədova");
  await page.getByLabel("E-mail").fill(second);
  await page.getByLabel("Nömrə").fill("+994 50 123 45 67");
  await page.getByRole("combobox", { name: "Mövzu" }).click();
  await page.getByRole("option", { name: "Reklam" }).click();
  await page.getByLabel("Mesajınız").fill("İkinci mesaj");
  await page.getByRole("button", { name: "Müraciət et" }).click();
  await expect(page.getByRole("dialog")).toContainText("Qəbul olundu!");
  expect(await sql`select 1 from contact_messages where email = ${second}`).toHaveLength(0);
});
