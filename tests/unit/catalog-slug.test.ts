import { test } from "node:test";
import assert from "node:assert/strict";
import { slugify, uniqueSlug } from "../../src/features/catalog/slug.ts";

test("Azerbaijani letters are transliterated, separators collapse to one dash", () => {
  assert.equal(slugify("Ağcabədi"), "agcabedi");
  assert.equal(slugify("Qida sənayesi"), "qida-senayesi");
  assert.equal(slugify("  İxrac — yönümlü!! "), "ixrac-yonumlu");
  assert.equal(slugify("Şəki / Çinar ÜÖĞ"), "seki-cinar-uog");
});

test("empty input gives an empty slug (caller must reject it)", () => {
  assert.equal(slugify("—"), "");
});

test("uniqueSlug appends -2, -3 … while taken", async () => {
  const taken = new Set(["agro", "agro-2"]);
  assert.equal(await uniqueSlug("agro", async (s) => taken.has(s)), "agro-3");
  assert.equal(await uniqueSlug("yeni", async (s) => taken.has(s)), "yeni");
});
