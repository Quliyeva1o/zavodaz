import { test } from "node:test";
import assert from "node:assert/strict";
import { parseTariff, tariffToRaw } from "../../src/features/tariffs/admin.ts";
import { parseContactSettings, slugify, splitEmails } from "../../src/features/contact/admin.ts";

const base = {
  name: { az: "Premium", en: "Premium", ru: "Премиум" },
  priceMonthQ: 799,
  priceYearQ: null,
  features: { az: ["A", "B"], en: [], ru: [] },
  limits: { products: 10, vacancies: null },
};

test("tariff: raw round trip and qəpik conversion", () => {
  const raw = tariffToRaw(base);
  assert.equal(raw.priceMonth, "7.99");
  assert.equal(raw["features.az"], "A\nB");
  const r = parseTariff({ ...raw, priceMonth: "8,49", priceYear: "86" });
  assert.ok(r.ok);
  assert.equal(r.data.priceMonthQ, 849);
  assert.equal(r.data.priceYearQ, 8600);
  assert.deepEqual(r.data.limits, { products: 10, vacancies: null });
  assert.deepEqual(r.data.features.az, ["A", "B"]);
});

test("tariff: rejects bad price, limit and empty AZ name", () => {
  const raw = tariffToRaw(base);
  const r = parseTariff({ ...raw, priceMonth: "7.999", products: "-1", "name.az": " " });
  assert.ok(!r.ok);
  assert.ok(r.errors.priceMonth && r.errors.products && r.errors["name.az"]);
  assert.equal(parseTariff({ ...raw, priceMonth: "0" }).ok, true);
});

test("contact: slug transliterates AZ letters", () => {
  assert.equal(slugify("Paket ödənişləri"), "paket-odenisleri");
  assert.equal(slugify("İşçi axtarışı!"), "isci-axtarisi");
  assert.equal(slugify("???"), "movzu");
});

test("contact: new topics get unique ids, emails are validated", () => {
  const t = (id: string, az: string) => ({ id, label: { az, en: "", ru: "" } });
  const ok = parseContactSettings({ topics: [t("other", "Digər"), t("", "Digər"), t("", "Digər")], notifyEmails: "a@b.az, a@b.az\nc@d.az" });
  assert.ok(ok.ok);
  assert.deepEqual(ok.data.topics.map((x) => x.id), ["other", "diger", "diger-2"]);
  assert.deepEqual(ok.data.notifyEmails, ["a@b.az", "c@d.az"]);
  assert.ok(!parseContactSettings({ topics: [], notifyEmails: "" }).ok);
  assert.ok(!parseContactSettings({ topics: [t("", "X")], notifyEmails: "yanlis" }).ok);
  assert.deepEqual(splitEmails(""), []);
});
