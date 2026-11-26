import { test } from "node:test";
import assert from "node:assert/strict";
import { EMPTY_FACTORY, parseFactory } from "../../src/features/factories/admin.ts";
import { MAX_FACTORY_IMAGES, MAX_PRODUCT_IMAGES, moveItem, parseProduct, parseTitle, youtubeVideoId } from "../../src/features/factory/content-admin.ts";

const ID = "dQw4w9WgXcQ";

test("youtubeVideoId: only youtube.com and youtu.be, the id is extracted", () => {
  for (const url of [
    `https://www.youtube.com/watch?v=${ID}`,
    `https://youtube.com/watch?v=${ID}&t=10s`,
    `https://m.youtube.com/watch?feature=share&v=${ID}`,
    `https://youtu.be/${ID}`,
    `https://youtu.be/${ID}?si=abc`,
    `https://www.youtube.com/embed/${ID}`,
    `https://www.youtube.com/shorts/${ID}`,
    `http://www.youtube.com/live/${ID}`,
  ]) {
    assert.equal(youtubeVideoId(url), ID, url);
  }
  for (const url of [
    "",
    "youtube.com/watch?v=" + ID,
    `https://evil.com/watch?v=${ID}`,
    `https://youtube.com.evil.com/watch?v=${ID}`,
    `https://notyoutu.be/${ID}`,
    "https://www.youtube.com/watch?v=kisa",
    "https://www.youtube.com/",
    `javascript:alert(1)//youtube.com/watch?v=${ID}`,
  ]) {
    assert.equal(youtubeVideoId(url), null, url);
  }
});

test("factory content fields: valid values are normalised", () => {
  const r = parseFactory({
    ...EMPTY_FACTORY,
    name: "Bakı Zavodu",
    legalName: "  Baku Plant MMC ",
    equipmentText: "CNC\r\nLazer",
    employeeCount: "250",
    capacityText: " 5 000 ton / il ",
    phone: "+994 50 123 45 67",
    email: "info@zavod.test",
    website: "https://zavod.test",
    address: "Bakı, Sumqayıt yolu 5",
    youtubeUrl: `https://youtu.be/${ID}?si=x`,
    socials: { ...EMPTY_FACTORY.socials, instagram: "https://instagram.com/zavod" },
  });
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.equal(r.data.legalName, "Baku Plant MMC");
  assert.equal(r.data.equipmentText, "CNC\nLazer");
  assert.equal(r.data.employeeCount, 250);
  assert.equal(r.data.capacityText, "5 000 ton / il");
  assert.equal(r.data.youtubeUrl, `https://www.youtube.com/watch?v=${ID}`);
  assert.deepEqual(r.data.socials, { instagram: "https://instagram.com/zavod" });
});

test("factory content fields: Azerbaijani errors keyed by field, socials by network", () => {
  const r = parseFactory({
    ...EMPTY_FACTORY,
    name: "Bakı Zavodu",
    employeeCount: "-3",
    phone: "salam",
    email: "yanlis",
    website: "ftp://x.az",
    youtubeUrl: "https://vimeo.com/123",
    socials: { ...EMPTY_FACTORY.socials, facebook: "facebook.com/x", tiktok: "javascript:alert(1)" },
  });
  assert.equal(r.ok, false);
  if (r.ok) return;
  assert.deepEqual(Object.keys(r.errors).sort(), ["email", "employeeCount", "phone", "social_facebook", "social_tiktok", "website", "youtubeUrl"]);
  assert.equal(r.errors.youtubeUrl, "Yalnız youtube.com və ya youtu.be linki");
  assert.equal(r.errors.social_facebook, "https:// ilə başlayan link yazın");
  assert.equal(r.errors.email, "E-poçt formatı yanlışdır");
});

test("factory content fields: empty values are fine", () => {
  const r = parseFactory({ ...EMPTY_FACTORY, name: "Bakı Zavodu" });
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.equal(r.data.employeeCount, null);
  assert.equal(r.data.youtubeUrl, "");
  assert.deepEqual(r.data.socials, {});
});

test("product form: name required, description ≤ 400, status; the slug comes from the name", () => {
  const ok = parseProduct({ name: " Polad boru ", description: "a".repeat(199) + "\r\n" + "b".repeat(200), status: "published" });
  assert.equal(ok.ok, true);
  if (!ok.ok) return;
  assert.equal(ok.data.name, "Polad boru");
  assert.equal(ok.data.description.length, 400);
  assert.equal(ok.data.slug, "polad-boru");

  const bad = parseProduct({ name: "P", description: "a".repeat(401), status: "x" });
  assert.equal(bad.ok, false);
  if (bad.ok) return;
  assert.deepEqual(Object.keys(bad.errors).sort(), ["description", "name", "status"]);
  assert.equal(bad.errors.description, "Ən çox 400 simvol");

  const noLatin = parseProduct({ name: "管道", description: "", status: "draft" });
  assert.equal(noLatin.ok && noLatin.data.slug, "mehsul");
});

test("title: required, trimmed, ≤ 120", () => {
  assert.deepEqual(parseTitle("  ISO 9001 "), { ok: true, title: "ISO 9001" });
  assert.deepEqual(parseTitle(" "), { ok: false, error: "Başlıq məcburidir" });
  assert.deepEqual(parseTitle("x".repeat(121)), { ok: false, error: "Ən çox 120 simvol" });
});

test("moveItem: swaps with the neighbour, stays put at the ends", () => {
  assert.deepEqual(moveItem(["a", "b", "c"], "b", "up"), ["b", "a", "c"]);
  assert.deepEqual(moveItem(["a", "b", "c"], "b", "down"), ["a", "c", "b"]);
  assert.deepEqual(moveItem(["a", "b", "c"], "a", "up"), ["a", "b", "c"]);
  assert.deepEqual(moveItem(["a", "b", "c"], "c", "down"), ["a", "b", "c"]);
  assert.deepEqual(moveItem(["a", "b"], "z", "up"), ["a", "b"]);
});

test("limits: six images each", () => {
  assert.equal(MAX_FACTORY_IMAGES, 6);
  assert.equal(MAX_PRODUCT_IMAGES, 6);
});

test("sayt http(s) qəbul edir, sosial şəbəkələr yalnız https", () => {
  const base = { ...EMPTY_FACTORY, name: "Bakı Zavodu", website: "http://zavod.test", socials: { ...EMPTY_FACTORY.socials, instagram: "https://instagram.com/z" } };
  assert.equal(parseFactory(base).ok, true);
  const r = parseFactory({ ...base, socials: { ...base.socials, facebook: "http://facebook.com/z" } });
  assert.equal(r.ok, false);
  if (r.ok) return;
  assert.equal(r.errors.social_facebook, "https:// ilə başlayan link yazın");
  const w = parseFactory({ ...base, website: "ftp://zavod.test" });
  assert.equal(w.ok, false);
  if (!w.ok) assert.equal(w.errors.website, "http:// və ya https:// ilə başlayan sayt ünvanı yazın");
});
