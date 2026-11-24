import { expect, test } from "@playwright/test";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { dictCities, dictIndustries, dictProductionModels, dictProductTypes, factories, media } from "../../src/db/schema";
import { buildCatalogQuery, buildLandingCounts, resolveCatalogIds, type CatalogIds } from "../../src/features/catalog/catalog-sql";
import { parseCatalogParams } from "../../src/features/catalog/filter";
import type { CatalogScope } from "../../src/features/catalog/types";

// Database only (no browser): everything runs inside a transaction that is rolled back.
const client = postgres(process.env.DATABASE_URL!, { max: 1 });
const db = drizzle(client);
test.afterAll(() => client.end());

class Rollback extends Error {}
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function inRolledBackTx(fn: (tx: Tx) => Promise<void>) {
  await expect(
    db.transaction(async (tx) => {
      await fn(tx);
      throw new Rollback();
    }),
  ).rejects.toBeInstanceOf(Rollback);
}

const name = (az: string) => ({ az, en: "", ru: "" });
const NO_IDS: CatalogIds = { industryId: null, cityId: null, productTypeId: null, modelId: null };

/** Empties `factories` inside the transaction (the dev DB may hold the Figma fixture) and adds own dictionary rows. */
async function setup(tx: Tx) {
  await tx.delete(factories);
  const [city1, city2] = await tx
    .insert(dictCities)
    .values([
      { slug: "e2e-q-city", name: name("E2E şəhər"), sort: 9001 },
      { slug: "e2e-q-city-2", name: name("E2E şəhər 2"), sort: 9002 },
    ])
    .returning();
  const [industry] = await tx.insert(dictIndustries).values({ slug: "e2e-q-industry", name: name("E2E sahə"), sort: 9001 }).returning();
  const [productType] = await tx.insert(dictProductTypes).values({ slug: "e2e-q-product", name: name("E2E məhsul"), sort: 9001 }).returning();
  const [model1, model2] = await tx
    .insert(dictProductionModels)
    .values([
      { slug: "e2e-q-model", name: name("E2E model"), sort: 9001 },
      { slug: "e2e-q-model-2", name: name("E2E model 2"), sort: 9002 },
    ])
    .returning();
  return { city1, city2, industry, productType, model1, model2 };
}

const at = (minutes: number) => new Date(Date.UTC(2026, 10, 1, 12, minutes));

/** Seven factories (A–E published, F draft, G hidden); see the expected orders in the tests. */
async function seedSeven(tx: Tx) {
  const d = await setup(tx);
  const [cover] = await tx
    .insert(media)
    .values({ kind: "image", width: 960, height: 640, variants: [320, 640, 960], blur: "data:image/webp;base64,AAAA", size: 1234 })
    .returning();
  const base = { cityId: d.city1.id, status: "published" as const, about: "" };
  await tx.insert(factories).values([
    { ...base, slug: "e2e-q-a", name: "A", type: "fabrik", tariffCode: "vip", tariffRank: 2, verified: false, createdAt: at(1), ratingAvg: 3, ratingCount: 1, coverId: cover.id, about: "Haqqında A" },
    { ...base, slug: "e2e-q-b", name: "B", type: "zavod", tariffCode: "premium", tariffRank: 1, verified: true, createdAt: at(2), ratingAvg: 4.5, ratingCount: 4, productionModelIds: [d.model1.id], cooperation: ["partner"], industryId: d.industry.id },
    { ...base, slug: "e2e-q-c", name: "C", type: "fabrik", verified: true, createdAt: at(3), ratingAvg: 5, ratingCount: 1, cityId: d.city2.id, productTypeId: d.productType.id },
    { ...base, slug: "e2e-q-d", name: "D", type: "fabrik", verified: false, createdAt: at(5), ratingAvg: 4, ratingCount: 10, productionModelIds: [d.model1.id, d.model2.id], cooperation: ["distributor", "sales"], industryId: d.industry.id },
    { ...base, slug: "e2e-q-e", name: "E", type: "sex", verified: false, createdAt: at(4), ratingAvg: 4, ratingCount: 2 },
    { ...base, slug: "e2e-q-f", name: "F", type: "fabrik", status: "draft", tariffCode: "vip", tariffRank: 2, verified: true, createdAt: at(6), ratingAvg: 5, ratingCount: 9, productionModelIds: [d.model1.id], cooperation: ["partner"] },
    { ...base, slug: "e2e-q-g", name: "G", type: "zavod", status: "hidden", tariffCode: "premium", tariffRank: 1, verified: true, createdAt: at(7), ratingAvg: 5, ratingCount: 9, productionModelIds: [d.model1.id], cooperation: ["partner"] },
  ]);
  return { ...d, cover };
}

const filter = (sp: Record<string, string | string[]> = {}, scope: CatalogScope = {}) => parseCatalogParams(sp, scope);
const slugs = (r: { items: { slug: string }[] }) => r.items.map((i) => i.slug);

test("default order: VIP → Premium → rest; verified first, then newest; draft and hidden never appear", async () => {
  await inRolledBackTx(async (tx) => {
    const d = await seedSeven(tx);
    const r = await buildCatalogQuery(tx, filter(), NO_IDS);
    expect(slugs(r)).toEqual(["e2e-q-a", "e2e-q-b", "e2e-q-c", "e2e-q-d", "e2e-q-e"]);
    expect(r.total).toBe(5);
    expect(r.pageCount).toBe(1);
    expect(r.items[0]).toEqual({
      id: expect.any(String),
      slug: "e2e-q-a",
      name: "A",
      about: "Haqqında A",
      type: "fabrik",
      verified: false,
      ratingAvg: 3,
      cover: { id: d.cover.id, variants: [320, 640, 960], blur: "data:image/webp;base64,AAAA", width: 960, height: 640 },
    });
    expect(r.items[1].cover).toBeNull();
  });
});

test("rating sorts: average, then rating count (more first)", async () => {
  await inRolledBackTx(async (tx) => {
    await seedSeven(tx);
    expect(slugs(await buildCatalogQuery(tx, filter({ sort: "rating_desc" }), NO_IDS))).toEqual(["e2e-q-c", "e2e-q-b", "e2e-q-d", "e2e-q-e", "e2e-q-a"]);
    expect(slugs(await buildCatalogQuery(tx, filter({ sort: "rating_asc" }), NO_IDS))).toEqual(["e2e-q-a", "e2e-q-d", "e2e-q-e", "e2e-q-b", "e2e-q-c"]);
  });
});

test("type + city, industry and product type filters", async () => {
  await inRolledBackTx(async (tx) => {
    const d = await seedSeven(tx);
    const typeCity = await buildCatalogQuery(tx, filter({ type: "fabrik", city: "e2e-q-city" }), { ...NO_IDS, cityId: d.city1.id });
    expect(slugs(typeCity)).toEqual(["e2e-q-a", "e2e-q-d"]);
    expect(typeCity.total).toBe(2);
    const types = await buildCatalogQuery(tx, filter({ type: ["sex", "zavod"] }), NO_IDS);
    expect(slugs(types)).toEqual(["e2e-q-b", "e2e-q-e"]);
    expect(slugs(await buildCatalogQuery(tx, filter({ industry: "e2e-q-industry" }), { ...NO_IDS, industryId: d.industry.id }))).toEqual(["e2e-q-b", "e2e-q-d"]);
    expect(slugs(await buildCatalogQuery(tx, filter({ product: "e2e-q-product" }), { ...NO_IDS, productTypeId: d.productType.id }))).toEqual(["e2e-q-c"]);
  });
});

test("production model (array contains) and cooperation", async () => {
  await inRolledBackTx(async (tx) => {
    const d = await seedSeven(tx);
    expect(slugs(await buildCatalogQuery(tx, filter({ model: "e2e-q-model" }), { ...NO_IDS, modelId: d.model1.id }))).toEqual(["e2e-q-b", "e2e-q-d"]);
    expect(slugs(await buildCatalogQuery(tx, filter({ model: "e2e-q-model-2" }), { ...NO_IDS, modelId: d.model2.id }))).toEqual(["e2e-q-d"]);
    expect(slugs(await buildCatalogQuery(tx, filter({ coop: "partner" }), NO_IDS))).toEqual(["e2e-q-b"]);
    expect(slugs(await buildCatalogQuery(tx, filter({ coop: "sales" }), NO_IDS))).toEqual(["e2e-q-d"]);
    const both = await buildCatalogQuery(tx, filter({ model: "e2e-q-model", coop: "distributor" }), { ...NO_IDS, modelId: d.model1.id });
    expect(slugs(both)).toEqual(["e2e-q-d"]);
  });
});

test("recommended lists only tariff_rank > 0 (published)", async () => {
  await inRolledBackTx(async (tx) => {
    await seedSeven(tx);
    const r = await buildCatalogQuery(tx, filter({}, { recommended: true }), NO_IDS);
    expect(slugs(r)).toEqual(["e2e-q-a", "e2e-q-b"]);
    expect(r.total).toBe(2);
  });
});

test("pagination: 15 per page, total and pageCount; no rows → pageCount 0", async () => {
  await inRolledBackTx(async (tx) => {
    const d = await setup(tx);
    await tx.insert(factories).values(
      Array.from({ length: 17 }, (_, i) => ({
        slug: `e2e-q-p-${String(i).padStart(2, "0")}`,
        name: `P${i}`,
        type: "fabrik" as const,
        status: "published" as const,
        cityId: d.city1.id,
        createdAt: at(i),
      })),
    );
    const p1 = await buildCatalogQuery(tx, filter(), NO_IDS);
    expect(p1.items).toHaveLength(15);
    expect(p1.items[0].slug).toBe("e2e-q-p-16");
    expect({ total: p1.total, pageCount: p1.pageCount }).toEqual({ total: 17, pageCount: 2 });
    const p2 = await buildCatalogQuery(tx, filter({ page: "2" }), NO_IDS);
    expect(slugs(p2)).toEqual(["e2e-q-p-01", "e2e-q-p-00"]);
    expect(p2.total).toBe(17);
    const empty = await buildCatalogQuery(tx, filter({ type: "aqropark" }), NO_IDS);
    expect(empty).toEqual({ items: [], total: 0, pageCount: 0 });
  });
});

test("landing counts group published factories by (type, city) and (type, industry), with slugs", async () => {
  await inRolledBackTx(async (tx) => {
    await seedSeven(tx);
    const rows = (await buildLandingCounts(tx)).filter((r) => r.slug.startsWith("e2e-q-"));
    expect(rows).toEqual([
      { type: "zavod", kind: "city", slug: "e2e-q-city", count: 1 },
      { type: "zavod", kind: "industry", slug: "e2e-q-industry", count: 1 },
      { type: "fabrik", kind: "city", slug: "e2e-q-city", count: 2 },
      { type: "fabrik", kind: "city", slug: "e2e-q-city-2", count: 1 },
      { type: "fabrik", kind: "industry", slug: "e2e-q-industry", count: 1 },
      { type: "sex", kind: "city", slug: "e2e-q-city", count: 1 },
    ]);
  });
});

test("slug → id resolution: an unknown slug means no results", () => {
  const dict = (id: number, slug: string) => ({ id, slug, name: name(slug) });
  const dicts = {
    cities: [dict(1, "baki")],
    industries: [dict(2, "qida")],
    productTypes: [dict(3, "hazir")],
    productionModels: [dict(4, "tam-dovr")],
  };
  expect(resolveCatalogIds(filter(), dicts)).toEqual(NO_IDS);
  expect(resolveCatalogIds(filter({ city: "baki", industry: "qida", product: "hazir", model: "tam-dovr" }), dicts)).toEqual({
    industryId: 2,
    cityId: 1,
    productTypeId: 3,
    modelId: 4,
  });
  expect(resolveCatalogIds(filter({ city: "gence" }), dicts)).toBeNull();
  expect(resolveCatalogIds(filter({ model: "baki" }), dicts)).toBeNull();
});
