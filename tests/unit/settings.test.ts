import { test } from "node:test";
import assert from "node:assert/strict";
import {
  defaultSiteSettings,
  mergeSettings,
  parseSettingsForm,
  telHref,
  whatsappHref,
} from "../../src/features/settings/schema.ts";

test("defaults are the texts drawn in Figma", () => {
  assert.equal(defaultSiteSettings.phone, "+994 000 00 00");
  assert.equal(defaultSiteSettings.address.az, "Lorem ipsum street 00, AZ 000");
  assert.equal(defaultSiteSettings.copyright.az, "©Bütün hüquqlar qorunur. Zavod.az, 2025");
});

test("mergeSettings fills missing fields from defaults", () => {
  const merged = mergeSettings({ phone: "+994 12 555 55 55" });
  assert.equal(merged.phone, "+994 12 555 55 55");
  assert.equal(merged.email, defaultSiteSettings.email);
});

test("mergeSettings falls back to defaults on broken data", () => {
  assert.deepEqual(mergeSettings({ phone: 42 }), defaultSiteSettings);
  assert.deepEqual(mergeSettings(undefined), defaultSiteSettings);
});

test("parseSettingsForm validates and normalises", () => {
  const form = new FormData();
  form.set("phone", " +994 12 555 55 55 ");
  form.set("phone2", "");
  form.set("whatsapp", "+994 50 123 45 67");
  form.set("email", "info@zavod.az");
  for (const l of ["az", "en", "ru"]) {
    form.set(`address.${l}`, "Bakı");
    form.set(`copyright.${l}`, "© Zavod.az");
  }
  for (const s of ["facebook", "instagram", "linkedin", "x", "youtube", "tiktok"]) form.set(`socials.${s}`, "");
  form.set("socials.facebook", "https://facebook.com/zavod.az");
  const res = parseSettingsForm(form);
  assert.ok(res.ok);
  assert.equal(res.data.phone, "+994 12 555 55 55");
  assert.equal(res.data.whatsapp, "+994501234567");
  assert.equal(res.data.socials.facebook, "https://facebook.com/zavod.az");
});

test("parseSettingsForm reports field errors", () => {
  const form = new FormData();
  form.set("email", "not-an-email");
  const res = parseSettingsForm(form);
  assert.equal(res.ok, false);
  if (!res.ok) assert.ok(res.errors.email);
});

test("link helpers", () => {
  assert.equal(whatsappHref("+994501234567"), "https://wa.me/994501234567");
  assert.equal(telHref("+994 12 555 55 55"), "tel:+994125555555");
});

test("parseSettingsForm reports length and link errors in Azerbaijani", () => {
  const form = new FormData();
  form.set("phone", "+99");
  form.set("phone2", "1".repeat(31));
  form.set("whatsapp", "+994501234567");
  form.set("email", "info@zavod.az");
  form.set("address.az", "x".repeat(201));
  form.set("copyright.en", "x".repeat(121));
  form.set("socials.facebook", "javascript:alert(1)");
  const res = parseSettingsForm(form);
  assert.equal(res.ok, false);
  if (res.ok) return;
  assert.equal(res.errors.phone, "Ən azı 5 simvol");
  assert.equal(res.errors.phone2, "Ən çox 30 simvol");
  assert.equal(res.errors["address.az"], "Ən çox 200 simvol");
  assert.equal(res.errors["copyright.en"], "Ən çox 120 simvol");
  assert.equal(res.errors["socials.facebook"], "Link http:// və ya https:// ilə başlamalıdır");
});
