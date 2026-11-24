import { test } from "node:test";
import assert from "node:assert/strict";
import { factorySlugRedirects, landingSlugRedirects, redirectCandidates } from "../../src/features/factory/slug-redirect.ts";

test("a factory slug change maps the factory URL and every tab, in all 3 languages", () => {
  const pairs = factorySlugRedirects("kohne", "yeni");
  assert.equal(pairs.length, 15); // 3 languages × (about + 4 tabs)
  assert.deepEqual(pairs.slice(0, 5), [
    { from: "/fabrik/kohne", to: "/fabrik/yeni" },
    { from: "/fabrik/kohne/media", to: "/fabrik/yeni/media" },
    { from: "/fabrik/kohne/mehsullar", to: "/fabrik/yeni/mehsullar" },
    { from: "/fabrik/kohne/texniki-imkanlar", to: "/fabrik/yeni/texniki-imkanlar" },
    { from: "/fabrik/kohne/vakansiyalar", to: "/fabrik/yeni/vakansiyalar" },
  ]);
  assert.ok(pairs.some((p) => p.from === "/en/factory/kohne/products" && p.to === "/en/factory/yeni/products"));
  assert.ok(pairs.some((p) => p.from === "/ru/fabrika/kohne/vakansii" && p.to === "/ru/fabrika/yeni/vakansii"));
  assert.deepEqual(factorySlugRedirects("same", "same"), []);
});

test("a city/industry slug change maps its landing under every factory type, in all 3 languages", () => {
  const pairs = landingSlugRedirects("baki", "baku");
  assert.equal(pairs.length, 18); // 6 types × 3 languages
  assert.ok(pairs.some((p) => p.from === "/fabrikler/baki" && p.to === "/fabrikler/baku"));
  assert.ok(pairs.some((p) => p.from === "/en/plants/baki" && p.to === "/en/plants/baku"));
  assert.ok(pairs.some((p) => p.from === "/ru/agroparki/baki" && p.to === "/ru/agroparki/baku"));
  assert.deepEqual(landingSlugRedirects("x", "x"), []);
});

test("redirect lookup candidates: the path itself, then its parents (so product pages follow a factory rename)", () => {
  assert.deepEqual(redirectCandidates("/fabrik/kohne/mehsullar/1519494-ad"), ["/fabrik/kohne/mehsullar/1519494-ad", "/fabrik/kohne/mehsullar", "/fabrik/kohne"]);
  assert.deepEqual(redirectCandidates("/en/factory/kohne"), ["/en/factory/kohne"]);
  assert.deepEqual(redirectCandidates("/fabrikler/baki"), ["/fabrikler/baki"]);
  assert.deepEqual(redirectCandidates("/x"), []);
  assert.deepEqual(redirectCandidates("/"), []);
});

test("lookupRedirect: the longest stored prefix wins and the rest of the path is kept", async () => {
  const { lookupRedirect } = await import("../../src/features/factory/slug-redirect.ts");
  const map = new Map([
    ["/fabrik/kohne", "/fabrik/yeni"],
    ["/fabrik/kohne/mehsullar", "/fabrik/yeni/mehsullar"],
    ["/en/factory/a/media", "/en/factory/b/media"],
  ]);
  assert.equal(lookupRedirect(map, "/fabrik/kohne"), "/fabrik/yeni");
  assert.equal(lookupRedirect(map, "/fabrik/kohne/"), "/fabrik/yeni");
  assert.equal(lookupRedirect(map, "/fabrik/kohne/mehsullar/1519494-ad"), "/fabrik/yeni/mehsullar/1519494-ad");
  assert.equal(lookupRedirect(map, "/en/factory/a/media"), "/en/factory/b/media");
  assert.equal(lookupRedirect(map, "/en/factory/a"), null);
  assert.equal(lookupRedirect(map, "/fabrik/basqa"), null);
  assert.equal(lookupRedirect(map, "/"), null);
});

test("releasedPaths: the public paths a new factory / landing slug takes back from old redirects", async () => {
  const { factorySlugPaths, landingSlugPaths } = await import("../../src/features/factory/slug-redirect.ts");
  const f = factorySlugPaths("e2e-x");
  assert.equal(f.length, 15);
  assert.ok(f.includes("/fabrik/e2e-x") && f.includes("/ru/fabrika/e2e-x/vakansii"));
  const l = landingSlugPaths("baki");
  assert.equal(l.length, 18);
  assert.ok(l.includes("/fabrikler/baki") && l.includes("/en/plants/baki"));
});
