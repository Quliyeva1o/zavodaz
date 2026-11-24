import { test } from "node:test";
import assert from "node:assert/strict";
import { catalogMetadata, itemListJsonLd } from "../../src/lib/catalog-seo.ts";
import { parseCatalogParams } from "../../src/features/catalog/filter.ts";

const basePaths = { az: "/kataloq", en: "/en/catalog", ru: "/ru/katalog" };
const meta = (sp: Record<string, string>, lang: "az" | "en" | "ru" = "az") =>
  catalogMetadata({ lang, scope: {}, filter: parseCatalogParams(sp, {}), title: "Kataloq", description: "Təsvir", basePaths });

test("catalog metadata: the unfiltered first page is indexable, canonical is the base, hreflang to every language", () => {
  const m = meta({});
  assert.equal(m.title, "Kataloq | Zavod.az");
  assert.equal(m.description, "Təsvir");
  assert.equal(m.robots, undefined);
  assert.equal(m.alternates?.canonical, "/kataloq");
  assert.deepEqual(m.alternates?.languages, { az: "/kataloq", en: "/en/catalog", ru: "/ru/katalog", "x-default": "/kataloq" });
  assert.equal(meta({ page: "1" }).alternates?.canonical, "/kataloq");
});

test("catalog metadata: page N ≥ 2 is its own canonical (title says the page), hreflang keeps ?page", () => {
  const m = meta({ page: "3" }, "en");
  assert.equal(m.alternates?.canonical, "/en/catalog?page=3");
  assert.equal(m.title, "Kataloq — Page 3 | Zavod.az");
  assert.deepEqual(m.alternates?.languages, { az: "/kataloq?page=3", en: "/en/catalog?page=3", ru: "/ru/katalog?page=3", "x-default": "/kataloq?page=3" });
  assert.equal(m.robots, undefined);
});

test("catalog metadata: any filter (also sort or an unknown slug) is noindex, follow with the base as canonical", () => {
  const cases: Record<string, string>[] = [{ city: "baki" }, { type: "fabrik", page: "2" }, { sort: "rating_desc" }, { industry: "yoxdur" }];
  for (const sp of cases) {
    const m = meta(sp);
    assert.deepEqual(m.robots, { index: false, follow: true });
    assert.equal(m.alternates?.canonical, "/kataloq");
    assert.equal(m.alternates?.languages, undefined);
  }
});

test("ItemList JSON-LD: absolute factory URLs per language, positions continue across pages", () => {
  const items = [{ slug: "a", name: "A" }, { slug: "b", name: "B" }];
  const ld = itemListJsonLd(items, "en", "https://zavod.az", 15);
  assert.equal(ld["@type"], "ItemList");
  assert.deepEqual(ld.itemListElement, [
    { "@type": "ListItem", position: 16, url: "https://zavod.az/en/factory/a", name: "A" },
    { "@type": "ListItem", position: 17, url: "https://zavod.az/en/factory/b", name: "B" },
  ]);
});

test("catalog metadata: an empty landing is noindex, follow without hreflang", () => {
  const scope = { types: ["fabrik" as const], landing: { kind: "city" as const, slug: "baki" } };
  const m = catalogMetadata({ lang: "az", scope, filter: parseCatalogParams({}, scope), title: "Fabriklər — Bakı", description: "T", basePaths, empty: true });
  assert.deepEqual(m.robots, { index: false, follow: true });
  assert.equal(m.alternates?.languages, undefined);
});
