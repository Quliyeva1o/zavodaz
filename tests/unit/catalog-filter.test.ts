import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCatalogParams, catalogSearch, isFiltered, normalizeCatalogFilter } from "../../src/features/catalog/filter.ts";

test("defaults", () => {
  const f = parseCatalogParams({}, {});
  assert.deepEqual(f, { types: [], industry: null, city: null, product: null, model: null, coop: null, recommended: false, sort: "default", page: 1 });
  assert.equal(catalogSearch(f, {}), "");
  assert.equal(isFiltered(f, {}), false);
});

test("unknown values are dropped, types are de-duplicated and kept in FACTORY_TYPES order", () => {
  const f = parseCatalogParams({ type: ["sex", "x", "zavod", "sex"], coop: "bad", sort: "nope", page: "0" }, {});
  assert.deepEqual(f.types, ["zavod", "sex"]);
  assert.equal(f.coop, null);
  assert.equal(f.sort, "default");
  assert.equal(f.page, 1);
});

test("page must be a positive integer within a sane bound", () => {
  assert.equal(parseCatalogParams({ page: "3" }, {}).page, 3);
  assert.equal(parseCatalogParams({ page: "2.5" }, {}).page, 1);
  assert.equal(parseCatalogParams({ page: "99999999" }, {}).page, 1);
});

test("scope wins: a type page ignores ?type, a landing fixes city or industry", () => {
  const f = parseCatalogParams({ type: "zavod", city: "gence" }, { types: ["fabrik"], landing: { kind: "city", slug: "baki" } });
  assert.deepEqual(f.types, ["fabrik"]);
  assert.equal(f.city, "baki");
  assert.equal(catalogSearch(f, { types: ["fabrik"], landing: { kind: "city", slug: "baki" } }), "");
});

test("canonical query string: fixed key order, page last, page=1 omitted", () => {
  const f = parseCatalogParams({ page: "2", city: "baki", type: ["sex", "zavod"], sort: "rating_desc" }, {});
  assert.equal(catalogSearch(f, {}), "?type=zavod&type=sex&city=baki&sort=rating_desc&page=2");
  assert.equal(isFiltered(f, {}), true);
  assert.equal(isFiltered(parseCatalogParams({ page: "4" }, {}), {}), false);
});

test("slug parameters must be lowercase ASCII slugs; repeated scalars take the first value", () => {
  const f = parseCatalogParams({ industry: "Qida", city: ["gence", "baki"], product: "a".repeat(81), model: "hazir-mehsul", coop: ["partner", "sales"] }, {});
  assert.equal(f.industry, null);
  assert.equal(f.city, "gence");
  assert.equal(f.product, null);
  assert.equal(f.model, "hazir-mehsul");
  assert.equal(f.coop, "partner");
  assert.equal(catalogSearch(f, {}), "?city=gence&model=hazir-mehsul&coop=partner");
});

test("an industry landing keeps ?city as a filter; the recommended scope sets recommended and is not a filter", () => {
  const scope = { landing: { kind: "industry" as const, slug: "qida" } };
  const f = parseCatalogParams({ industry: "metal", city: "baki" }, scope);
  assert.equal(f.industry, "qida");
  assert.equal(f.city, "baki");
  assert.equal(catalogSearch(f, scope), "?city=baki");
  assert.equal(isFiltered(f, scope), true);

  const rec = parseCatalogParams({ page: "2", sort: "rating_asc" }, { recommended: true });
  assert.equal(rec.recommended, true);
  assert.equal(catalogSearch(rec, { recommended: true }), "?sort=rating_asc&page=2");
  assert.equal(isFiltered(parseCatalogParams({ page: "2" }, { recommended: true }), { recommended: true }), false);
});

test("normalizeCatalogFilter drops slugs missing from the dictionaries (R8), keeps known ones and the page scope", () => {
  const d = (id: number, slug: string) => ({ id, slug, name: { az: slug, en: "", ru: "" } });
  const dicts = { cities: [d(1, "baki")], industries: [d(2, "qida")], productTypes: [d(3, "hazir")], productionModels: [d(4, "tam-dovr")] };
  const f = parseCatalogParams({ city: "baki", industry: "yoxdur", product: "hazir", model: "zibil", page: "2" }, {});
  const n = normalizeCatalogFilter(f, dicts, {});
  assert.equal(n.city, "baki");
  assert.equal(n.industry, null);
  assert.equal(n.product, "hazir");
  assert.equal(n.model, null);
  assert.equal(n.page, 2);
  assert.equal(catalogSearch(n, {}), "?city=baki&product=hazir&page=2");
  // A landing slug belongs to the page (Task 9 decides 404); it is never dropped here.
  const scope = { landing: { kind: "city" as const, slug: "yoxdur" } };
  assert.equal(normalizeCatalogFilter(parseCatalogParams({}, scope), dicts, scope).city, "yoxdur");
});
