import { test } from "node:test";
import assert from "node:assert/strict";
import { escapeLike, factoryFormSchema, parseFactory, tariffRankOf, tariffUntilFromInput, tariffUntilToInput } from "../../src/features/factories/admin.ts";
import { dictFormSchema, parseDictEntry } from "../../src/features/catalog/dict-admin.ts";

test("tariff rank: vip 2, premium 1, standart/expired 0", () => {
  const now = new Date("2026-11-17T12:00:00Z");
  assert.equal(tariffRankOf("vip", new Date("2026-12-01"), now), 2);
  assert.equal(tariffRankOf("premium", null, now), 1);
  assert.equal(tariffRankOf("premium", new Date("2026-11-01"), now), 0);
  assert.equal(tariffRankOf("standart", null, now), 0);
  assert.equal(tariffRankOf("naməlum", null, now), 0);
});

test("factory form: Azerbaijani messages, about ≤ 400, unknown type rejected", () => {
  const r = factoryFormSchema.safeParse({ type: "x", name: "A", about: "a".repeat(401) });
  assert.equal(r.success, false);
  const msgs = r.error!.issues.map((i) => i.message).join(" | ");
  assert.match(msgs, /Ən azı 2 simvol/);
  assert.match(msgs, /Ən çox 400 simvol/);
  assert.match(msgs, /Tipi seçin/);
});

test("factory form: empty slug comes from the name; a typed slug is kept and marked manual", () => {
  const auto = factoryFormSchema.parse({ type: "fabrik", name: "Gəncə Şüşə Fabriki", slug: "" });
  assert.equal(auto.slug, "gence-suse-fabriki");
  assert.equal(auto.slugManual, false);
  const manual = factoryFormSchema.parse({ type: "fabrik", name: "Gəncə Şüşə Fabriki", slug: "gence-1" });
  assert.equal(manual.slug, "gence-1");
  assert.equal(manual.slugManual, true);
  const bad = factoryFormSchema.safeParse({ type: "fabrik", name: "Ad", slug: "Böyük Hərf" });
  assert.equal(bad.success, false);
  assert.match(bad.error!.issues[0].message, /kiçik latın hərfləri/);
  const noSlug = factoryFormSchema.safeParse({ type: "fabrik", name: "!!!" });
  assert.equal(noSlug.success, false);
  assert.match(noSlug.error!.issues.map((i) => i.message).join(" "), /slug-ı əl ilə yazın/);
});

test("factory form: about counts a CRLF line break as one character (like the textarea)", () => {
  const about = "a".repeat(199) + "\r\n" + "b".repeat(200);
  const r = factoryFormSchema.parse({ type: "zavod", name: "Ad Zavod", about });
  assert.equal(r.about.length, 400);
});

test("parseFactory: raw form strings → typed values; errors keyed by field", () => {
  const ok = parseFactory({
    type: "zavod",
    name: " Bakı Zavodu ",
    slug: "",
    about: "",
    industryId: "3",
    productTypeId: "",
    cityId: "12",
    productionModelIds: ["1", "4"],
    cooperation: ["partner"],
    verified: true,
    status: "published",
    tariffCode: "premium",
    tariffUntil: "2026-12-31",
    removeCover: false,
  });
  assert.equal(ok.ok, true);
  if (!ok.ok) return;
  assert.equal(ok.data.name, "Bakı Zavodu");
  assert.equal(ok.data.industryId, 3);
  assert.equal(ok.data.productTypeId, null);
  assert.deepEqual(ok.data.productionModelIds, [1, 4]);
  assert.deepEqual(ok.data.cooperation, ["partner"]);
  // The chosen day stays valid until its end in Baku (UTC+4).
  assert.equal(ok.data.tariffUntil?.toISOString(), "2026-12-31T19:59:59.999Z");

  const bad = parseFactory({
    type: "zavod",
    name: "Z",
    slug: "",
    about: "",
    industryId: "abc",
    productTypeId: "",
    cityId: "",
    productionModelIds: [],
    cooperation: ["spam"],
    verified: false,
    status: "x",
    tariffCode: "gold",
    tariffUntil: "31.12.2026",
    removeCover: false,
  });
  assert.equal(bad.ok, false);
  if (bad.ok) return;
  assert.deepEqual(Object.keys(bad.errors).sort(), ["cooperation", "industryId", "name", "status", "tariffCode", "tariffUntil"]);
  assert.equal(bad.errors.name, "Ən azı 2 simvol");
  assert.equal(bad.errors.tariffUntil, "Tarix formatı: İİİİ-AA-GG");
});

test("tariff date: input ↔ stored timestamp round-trips in Baku time", () => {
  const d = tariffUntilFromInput("2027-01-15")!;
  assert.equal(tariffUntilToInput(d), "2027-01-15");
  assert.equal(tariffUntilFromInput(""), null);
  assert.equal(tariffUntilToInput(null), "");
});

test("escapeLike escapes %, _ and backslash", () => {
  assert.equal(escapeLike("50%_a\\b"), "50\\%\\_a\\\\b");
  assert.equal(escapeLike("Zavod"), "Zavod");
});

test("dictionary form: slug pattern, AZ name required, EN/RU ≤ 80, integer sort", () => {
  assert.equal(dictFormSchema.safeParse({ slug: "baki", name: { az: "Bakı", en: "", ru: "" }, sort: 0 }).success, true);
  const r = dictFormSchema.safeParse({ slug: "Bakı!", name: { az: "", en: "x".repeat(81), ru: "" }, sort: 1.5 });
  assert.equal(r.success, false);
  const msgs = r.error!.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(" | ");
  assert.match(msgs, /slug: Yalnız kiçik latın hərfləri, rəqəm və tire/);
  assert.match(msgs, /name\.az: Ad \(AZ\) məcburidir/);
  assert.match(msgs, /name\.en: Ən çox 80 simvol/);
  assert.match(msgs, /sort: Tam ədəd yazın/);
  assert.equal(dictFormSchema.safeParse({ slug: "a".repeat(81), name: { az: "A", en: "", ru: "" }, sort: 0 }).success, false);
  // Same strictness as the factory SLUG_RE: no leading/trailing dash, no "--", no empty slug.
  for (const bad of ["-baki", "baki-", "a--b", "", "-"]) {
    assert.equal(dictFormSchema.safeParse({ slug: bad, name: { az: "A", en: "", ru: "" }, sort: 0 }).success, false, bad);
  }
  assert.equal(dictFormSchema.safeParse({ slug: "ab-cd-1", name: { az: "A", en: "", ru: "" }, sort: 0 }).success, true);
});

test("parseDictEntry: raw strings → entry; empty slug comes from the AZ name", () => {
  const ok = parseDictEntry({ slug: "", "name.az": " Xırdalan ", "name.en": "Khirdalan", "name.ru": "", sort: "5" });
  assert.deepEqual(ok, { ok: true, data: { slug: "xirdalan", name: { az: "Xırdalan", en: "Khirdalan", ru: "" }, sort: 5 } });
  const bad = parseDictEntry({ slug: "", "name.az": "", "name.en": "", "name.ru": "", sort: "" });
  assert.equal(bad.ok, false);
  if (bad.ok) return;
  assert.equal(bad.errors["name.az"], "Ad (AZ) məcburidir");
  assert.equal(bad.errors.sort, "Tam ədəd yazın");
});
