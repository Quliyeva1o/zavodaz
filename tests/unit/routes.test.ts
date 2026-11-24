import { test } from "node:test";
import assert from "node:assert/strict";
import { locales } from "../../src/i18n/config.ts";
import {
  FACTORY_TABS,
  factoryHref,
  factoryTabSegments,
  href,
  productHref,
  productKey,
  recommendedHref,
  resolvePublicPath,
  staticRoutes,
  switchLocalePath,
  typeHref,
  typeRoutes,
  type RouteKey,
} from "../../src/i18n/routes.ts";

test("href builds public URLs (AZ without prefix)", () => {
  assert.equal(href("home", "az"), "/");
  assert.equal(href("home", "en"), "/en");
  assert.equal(href("catalog", "az"), "/kataloq");
  assert.equal(href("catalog", "ru"), "/ru/katalog");
  assert.equal(href("vacancies", "az", "middle-designer-12"), "/vakansiyalar/middle-designer-12");
});

test("resolvePublicPath rewrites, redirects and rejects", () => {
  assert.deepEqual(resolvePublicPath("/"), { kind: "rewrite", internal: "/az" });
  assert.deepEqual(resolvePublicPath("/en"), { kind: "rewrite", internal: "/en" });
  assert.deepEqual(resolvePublicPath("/kataloq"), { kind: "rewrite", internal: "/az/catalog" });
  assert.deepEqual(resolvePublicPath("/az/kataloq"), { kind: "redirect", to: "/kataloq" });
  assert.deepEqual(resolvePublicPath("/en/kataloq"), { kind: "notFound", locale: "en" });
  assert.deepEqual(resolvePublicPath("/yoxdur"), { kind: "notFound", locale: "az" });
});

test("switchLocalePath keeps the page when changing language", () => {
  assert.equal(switchLocalePath("/kataloq", "en"), "/en/catalog");
  assert.equal(switchLocalePath("/en/catalog", "az"), "/kataloq");
  assert.equal(switchLocalePath("/ru", "az"), "/");
  assert.equal(switchLocalePath("/yoxdur", "ru"), "/ru");
});

test("every language has unique URL segments", () => {
  for (const l of locales) {
    const segments = (Object.keys(staticRoutes) as RouteKey[]).map((k) => staticRoutes[k][l]).filter(Boolean);
    assert.equal(new Set(segments).size, segments.length, `duplicate segment in ${l}`);
  }
});

test("factory type pages and landings", () => {
  assert.deepEqual(resolvePublicPath("/fabrikler"), { kind: "rewrite", internal: "/az/catalog/type/fabrik" });
  assert.deepEqual(resolvePublicPath("/fabrikler/baki"), { kind: "rewrite", internal: "/az/catalog/type/fabrik/baki" });
  assert.deepEqual(resolvePublicPath("/zavodlar/baki"), { kind: "rewrite", internal: "/az/catalog/type/zavod/baki" });
  assert.deepEqual(resolvePublicPath("/en/factories/qida-senayesi"), { kind: "rewrite", internal: "/en/catalog/type/fabrik/qida-senayesi" });
  assert.deepEqual(resolvePublicPath("/ru/fabriki"), { kind: "rewrite", internal: "/ru/catalog/type/fabrik" });
  assert.deepEqual(resolvePublicPath("/en/fabrikler"), { kind: "notFound", locale: "en" });
  assert.deepEqual(resolvePublicPath("/fabrikler/baki/x"), { kind: "notFound", locale: "az" });
});

test("recommended sub-page is translated", () => {
  assert.deepEqual(resolvePublicPath("/kataloq/tovsiyye-edilenler"), { kind: "rewrite", internal: "/az/catalog/recommended" });
  assert.deepEqual(resolvePublicPath("/en/catalog/recommended"), { kind: "rewrite", internal: "/en/catalog/recommended" });
  assert.deepEqual(resolvePublicPath("/ru/katalog/rekomenduemye"), { kind: "rewrite", internal: "/ru/catalog/recommended" });
  assert.deepEqual(resolvePublicPath("/kataloq/recommended"), { kind: "notFound", locale: "az" });
  assert.deepEqual(resolvePublicPath("/kataloq/x"), { kind: "notFound", locale: "az" });
});

test("hrefs and language switch", () => {
  assert.equal(typeHref("sex", "az"), "/sexler");
  assert.equal(typeHref("aqropark", "en", "baki"), "/en/agroparks/baki");
  assert.equal(recommendedHref("en"), "/en/catalog/recommended");
  assert.equal(factoryHref("agro-trade", "ru"), "/ru/fabrika/agro-trade");
  assert.equal(switchLocalePath("/zavodlar/baki", "en"), "/en/plants/baki");
  assert.equal(switchLocalePath("/fabrikler", "ru"), "/ru/fabriki");
  assert.equal(switchLocalePath("/kataloq/tovsiyye-edilenler", "ru"), "/ru/katalog/rekomenduemye");
  assert.equal(switchLocalePath("/fabrik/agro-trade", "en"), "/en/factory/agro-trade");
});

test("factory page resolves per language", () => {
  assert.deepEqual(resolvePublicPath("/en/factory/agro-trade"), { kind: "rewrite", internal: "/en/factory/agro-trade" });
  assert.deepEqual(resolvePublicPath("/en/fabrik/agro-trade"), { kind: "notFound", locale: "en" });
});

test("type segments are unique and do not clash with static routes", () => {
  for (const l of locales) {
    const statics = (Object.keys(staticRoutes) as RouteKey[]).map((k) => staticRoutes[k][l]).filter(Boolean);
    const types = Object.values(typeRoutes).map((r) => r[l]);
    assert.equal(new Set([...statics, ...types]).size, statics.length + types.length, `clash in ${l}`);
  }
});

// ---------- Factory page tabs and products (step 3) ----------

const TAB_PATHS = {
  az: { base: "/fabrik/agro-trade", media: "/media", products: "/mehsullar", capabilities: "/texniki-imkanlar", vacancies: "/vakansiyalar" },
  en: { base: "/en/factory/agro-trade", media: "/media", products: "/products", capabilities: "/capabilities", vacancies: "/vacancies" },
  ru: { base: "/ru/fabrika/agro-trade", media: "/media", products: "/produkciya", capabilities: "/vozmozhnosti", vacancies: "/vakansii" },
} as const;
const SUB_TABS = FACTORY_TABS.filter((t) => t !== "about");

test("factoryHref: the about tab is the factory URL itself (step-2 card links unchanged); every tab in 3 languages", () => {
  for (const l of locales) {
    const p = TAB_PATHS[l];
    assert.equal(factoryHref("agro-trade", l), p.base);
    assert.equal(factoryHref("agro-trade", l, "about"), p.base);
    for (const tab of SUB_TABS) assert.equal(factoryHref("agro-trade", l, tab), p.base + p[tab], `${l} ${tab}`);
  }
});

test("resolvePublicPath: factory tabs are translated per language, the internal tab key is fixed", () => {
  for (const l of locales) {
    const p = TAB_PATHS[l];
    assert.deepEqual(resolvePublicPath(p.base), { kind: "rewrite", internal: `/${l}/factory/agro-trade` });
    for (const tab of SUB_TABS) {
      assert.deepEqual(resolvePublicPath(p.base + p[tab]), { kind: "rewrite", internal: `/${l}/factory/agro-trade/${tab}` }, `${l} ${tab}`);
    }
  }
});

test("resolvePublicPath: another language's tab segment, unknown tabs and extra segments → notFound", () => {
  assert.deepEqual(resolvePublicPath("/fabrik/agro-trade/products"), { kind: "notFound", locale: "az" });
  assert.deepEqual(resolvePublicPath("/en/factory/agro-trade/mehsullar"), { kind: "notFound", locale: "en" });
  assert.deepEqual(resolvePublicPath("/ru/fabrika/agro-trade/vakansiyalar"), { kind: "notFound", locale: "ru" });
  assert.deepEqual(resolvePublicPath("/en/factory/agro-trade/vakansii"), { kind: "notFound", locale: "en" });
  assert.deepEqual(resolvePublicPath("/fabrik/agro-trade/about"), { kind: "notFound", locale: "az" }); // internal key, not a public segment
  assert.deepEqual(resolvePublicPath("/fabrik/agro-trade/haqqinda"), { kind: "notFound", locale: "az" });
  assert.deepEqual(resolvePublicPath("/fabrik"), { kind: "notFound", locale: "az" });
  assert.deepEqual(resolvePublicPath("/fabrik/agro-trade/media/x"), { kind: "notFound", locale: "az" });
  assert.deepEqual(resolvePublicPath("/fabrik/agro-trade/mehsullar/1519494-ad/x"), { kind: "notFound", locale: "az" });
});

test("product pages: …/<products tab>/<code>-<slug> in 3 languages; a segment without a code → notFound", () => {
  const product = { id: 1519494, slug: "mehsulun-adi" };
  assert.equal(productHref("agro-trade", product, "az"), "/fabrik/agro-trade/mehsullar/1519494-mehsulun-adi");
  assert.equal(productHref("agro-trade", product, "en"), "/en/factory/agro-trade/products/1519494-mehsulun-adi");
  assert.equal(productHref("agro-trade", product, "ru"), "/ru/fabrika/agro-trade/produkciya/1519494-mehsulun-adi");
  assert.equal(productHref("agro-trade", { id: 1000001, slug: "" }, "az"), "/fabrik/agro-trade/mehsullar/1000001");
  for (const l of locales) {
    assert.deepEqual(resolvePublicPath(productHref("agro-trade", product, l)), {
      kind: "rewrite",
      internal: `/${l}/factory/agro-trade/products/1519494-mehsulun-adi`,
    });
  }
  // The slug part is cosmetic: any (or none) still resolves; the page redirects to the canonical one.
  assert.deepEqual(resolvePublicPath("/fabrik/agro-trade/mehsullar/1519494"), { kind: "rewrite", internal: "/az/factory/agro-trade/products/1519494" });
  assert.deepEqual(resolvePublicPath("/fabrik/agro-trade/mehsullar/1519494-kohne"), { kind: "rewrite", internal: "/az/factory/agro-trade/products/1519494-kohne" });
  for (const bad of ["mehsulun-adi", "-1519494", "01519494-x", "1519494x", "abc-1519494", "1519494-"]) {
    assert.deepEqual(resolvePublicPath(`/fabrik/agro-trade/mehsullar/${bad}`), { kind: "notFound", locale: "az" }, bad);
  }
  assert.deepEqual(resolvePublicPath("/fabrik/agro-trade/media/1519494-x"), { kind: "notFound", locale: "az" }); // only under products
});

test("productKey: the code is the key; the slug part does not matter", () => {
  assert.equal(productKey("1519494-mehsulun-adi"), 1519494);
  assert.equal(productKey("1519494"), 1519494);
  assert.equal(productKey("1000000-a-b-c"), 1000000);
  for (const bad of ["", "mehsul", "-1519494", "01519494", "1519494x", "1519494-", "1.5", "99999999999999999999-x"]) {
    assert.equal(productKey(bad), null, bad);
  }
});

test("switchLocalePath keeps the factory tab and the product", () => {
  assert.equal(switchLocalePath("/fabrik/agro-trade/mehsullar", "en"), "/en/factory/agro-trade/products");
  assert.equal(switchLocalePath("/en/factory/agro-trade/capabilities", "ru"), "/ru/fabrika/agro-trade/vozmozhnosti");
  assert.equal(switchLocalePath("/ru/fabrika/agro-trade/vakansii", "az"), "/fabrik/agro-trade/vakansiyalar");
  assert.equal(switchLocalePath("/fabrik/agro-trade/media", "ru"), "/ru/fabrika/agro-trade/media");
  assert.equal(switchLocalePath("/fabrik/agro-trade/mehsullar/1519494-mehsulun-adi", "en"), "/en/factory/agro-trade/products/1519494-mehsulun-adi");
  assert.equal(switchLocalePath("/en/factory/agro-trade/products/1519494-x", "az"), "/fabrik/agro-trade/mehsullar/1519494-x");
});

test("factory tab segments are unique per language", () => {
  for (const l of locales) {
    const segs = SUB_TABS.map((t) => factoryTabSegments[t][l]);
    assert.equal(new Set(segs).size, segs.length, l);
  }
});
