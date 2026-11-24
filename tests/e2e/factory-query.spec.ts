import { expect, test } from "@playwright/test";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { factories, factoryCertificates, factoryFiles, factoryImages, media, productImages, products, redirects, vacancies } from "../../src/db/schema";
import { castVote, findVote } from "../../src/features/factory/rating-sql";
import { findFactoryBySlug, findProduct, findProductSlug, listFactoryProducts, listFactoryVacancies, listSimilarProducts } from "../../src/features/factory/factory-sql";
import { findRedirect, recordLandingSlugChange, recordSlugChange, releaseFactorySlug, releaseLandingSlug } from "../../src/features/factory/slug-redirect";

// Database only (no browser): everything runs inside a transaction that is rolled back (R1/R9: "e2e-f-" rows).
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

const at = (minutes: number) => new Date(Date.UTC(2026, 10, 1, 12, minutes));
const image = (blur: string) => ({ kind: "image" as const, width: 960, height: 640, variants: [320, 640, 960], blur, size: 100 });

async function seed(tx: Tx) {
  const imgs = await tx.insert(media).values(Array.from({ length: 8 }, (_, i) => image(`data:image/webp;base64,${i}`))).returning();
  const [pdf] = await tx.insert(media).values({ kind: "pdf", width: 0, height: 0, variants: [], blur: "", size: 2_500_000 }).returning();
  const [f, other, hidden] = await tx
    .insert(factories)
    .values([
      {
        type: "fabrik",
        slug: "e2e-f-agro",
        name: "E2E Agro",
        legalName: "E2E Agro MMC",
        status: "published",
        coverId: imgs[0].id,
        logoId: imgs[1].id,
        equipmentText: "Xətt 1\nXətt 2",
        employeeCount: 120,
        socials: { facebook: "https://facebook.com/e2e" },
      },
      { type: "zavod", slug: "e2e-f-other", name: "E2E Other", status: "published" },
      { type: "zavod", slug: "e2e-f-hidden", name: "E2E Hidden", status: "hidden" },
    ])
    .returning();
  await tx.insert(factoryImages).values([
    { factoryId: f.id, mediaId: imgs[3].id, sort: 2 },
    { factoryId: f.id, mediaId: imgs[2].id, sort: 1 },
  ]);
  await tx.insert(factoryCertificates).values({ factoryId: f.id, mediaId: imgs[4].id, title: "ISO 9001" });
  await tx.insert(factoryFiles).values({ factoryId: f.id, mediaId: pdf.id, title: "Kataloq 2026" });

  // 14 published (minute 1..14, newest = 14), one draft, one hidden, one of another factory.
  const rows = [
    ...Array.from({ length: 14 }, (_, i) => ({ factoryId: f.id, slug: `e2e-f-p${i + 1}`, name: `P${i + 1}`, status: "published" as const, createdAt: at(i + 1) })),
    { factoryId: f.id, slug: "e2e-f-draft", name: "Draft", status: "draft" as const, createdAt: at(30) },
    { factoryId: f.id, slug: "e2e-f-hidden", name: "Hidden", status: "hidden" as const, createdAt: at(31) },
    { factoryId: other.id, slug: "e2e-f-foreign", name: "Foreign", status: "published" as const, createdAt: at(32) },
  ];
  const prods = await tx.insert(products).values(rows).returning();
  const bySlug = (s: string) => prods.find((p) => p.slug === s)!;
  // P14 has two images; the lower sort is its main image whatever the insert order.
  await tx.insert(productImages).values([
    { productId: bySlug("e2e-f-p14").id, mediaId: imgs[6].id, sort: 1 },
    { productId: bySlug("e2e-f-p14").id, mediaId: imgs[5].id, sort: 0 },
  ]);

  const day = 24 * 3600_000;
  await tx.insert(vacancies).values([
    { factoryId: f.id, slug: "e2e-f-v-old", title: "Köhnə", status: "published", publishedAt: at(1), salary: 1500 },
    { factoryId: f.id, slug: "e2e-f-v-new", title: "Yeni", status: "published", publishedAt: at(5), expiresAt: new Date(Date.now() + day) },
    { factoryId: f.id, slug: "e2e-f-v-expired", title: "Bitib", status: "published", publishedAt: at(9), expiresAt: new Date(Date.now() - day) },
    { factoryId: f.id, slug: "e2e-f-v-draft", title: "Qaralama", status: "draft", publishedAt: at(10) },
  ]);
  return { f, other, hidden, imgs, pdf, bySlug };
}

test("findFactoryBySlug: contacts, cover/logo, gallery and certificates in admin order, PDF files with size; any status", async () => {
  await inRolledBackTx(async (tx) => {
    const { f, hidden, imgs, pdf } = await seed(tx);
    const page = await findFactoryBySlug(tx, "e2e-f-agro");
    expect(page).toMatchObject({
      id: f.id,
      name: "E2E Agro",
      legalName: "E2E Agro MMC",
      status: "published",
      equipmentText: "Xətt 1\nXətt 2",
      employeeCount: 120,
      capacityText: "",
      socials: { facebook: "https://facebook.com/e2e" },
      cover: { id: imgs[0].id, variants: [320, 640, 960], width: 960, height: 640, blur: "data:image/webp;base64,0" },
      logo: { id: imgs[1].id },
    });
    expect(page!.images.map((i) => i.id)).toEqual([imgs[2].id, imgs[3].id]);
    expect(page!.certificates).toEqual([{ id: expect.any(String), title: "ISO 9001", image: expect.objectContaining({ id: imgs[4].id }) }]);
    expect(page!.files).toEqual([{ id: expect.any(String), title: "Kataloq 2026", mediaId: pdf.id, size: 2_500_000 }]);
    // The public wrapper turns a non-published status into 404; the builder reports it.
    expect((await findFactoryBySlug(tx, "e2e-f-hidden"))?.status).toBe("hidden");
    expect((await findFactoryBySlug(tx, "e2e-f-hidden"))?.id).toBe(hidden.id);
    expect(await findFactoryBySlug(tx, "e2e-f-yoxdur")).toBeNull();
    const bare = await findFactoryBySlug(tx, "e2e-f-other");
    expect(bare).toMatchObject({ cover: null, logo: null, images: [], certificates: [], files: [], socials: {} });
  });
});

test("products: published only, newest first, 12 per page, main image = lowest sort; codes start at 1 000 000", async () => {
  await inRolledBackTx(async (tx) => {
    const { f, imgs, bySlug } = await seed(tx);
    expect(bySlug("e2e-f-p1").id).toBeGreaterThanOrEqual(1_000_000);
    const p1 = await listFactoryProducts(tx, f.id, 1, 12);
    expect(p1.total).toBe(14);
    expect(p1.pageCount).toBe(2);
    expect(p1.items.map((p) => p.name)).toEqual(["P14", "P13", "P12", "P11", "P10", "P9", "P8", "P7", "P6", "P5", "P4", "P3"]);
    expect(p1.items[0].image?.id).toBe(imgs[5].id);
    expect(p1.items[1].image).toBeNull();
    const p2 = await listFactoryProducts(tx, f.id, 2, 12);
    expect(p2.items.map((p) => p.name)).toEqual(["P2", "P1"]);
    expect((await listFactoryProducts(tx, f.id, 3, 12)).items).toEqual([]);
  });
});

test("product by code: this factory's published one with all images; draft, hidden and another factory's → null", async () => {
  await inRolledBackTx(async (tx) => {
    const { f, other, imgs, bySlug } = await seed(tx);
    const p = await findProduct(tx, f.id, bySlug("e2e-f-p14").id);
    expect(p).toMatchObject({ name: "P14", slug: "e2e-f-p14", factoryId: f.id, image: { id: imgs[5].id } });
    expect(p!.images.map((i) => i.id)).toEqual([imgs[5].id, imgs[6].id]);
    expect(await findProduct(tx, f.id, bySlug("e2e-f-draft").id)).toBeNull();
    expect(await findProduct(tx, f.id, bySlug("e2e-f-hidden").id)).toBeNull();
    expect(await findProduct(tx, f.id, bySlug("e2e-f-foreign").id)).toBeNull();
    expect(await findProduct(tx, other.id, bySlug("e2e-f-foreign").id)).not.toBeNull();
  });
});

test("findProductSlug (proxy 301): the slug of a published product under its own published factory; draft, hidden, foreign factory → null", async () => {
  await inRolledBackTx(async (tx) => {
    const { bySlug } = await seed(tx);
    expect(await findProductSlug(tx, "e2e-f-agro", bySlug("e2e-f-p14").id)).toBe("e2e-f-p14");
    expect(await findProductSlug(tx, "e2e-f-other", bySlug("e2e-f-p14").id)).toBeNull();
    expect(await findProductSlug(tx, "e2e-f-agro", bySlug("e2e-f-draft").id)).toBeNull();
    expect(await findProductSlug(tx, "e2e-f-agro", bySlug("e2e-f-hidden").id)).toBeNull();
    expect(await findProductSlug(tx, "e2e-f-agro", bySlug("e2e-f-foreign").id)).toBeNull();
    expect(await findProductSlug(tx, "e2e-f-agro", 1)).toBeNull();
  });
});

test("similar products: the same factory's 6 newest others (not itself, no draft/hidden/foreign)", async () => {
  await inRolledBackTx(async (tx) => {
    const { f, bySlug } = await seed(tx);
    const similar = await listSimilarProducts(tx, f.id, bySlug("e2e-f-p13").id, 6);
    expect(similar.map((p) => p.name)).toEqual(["P14", "P12", "P11", "P10", "P9", "P8"]);
  });
});

test("vacancies tab: published and not expired, newest first", async () => {
  await inRolledBackTx(async (tx) => {
    const { f, other } = await seed(tx);
    const v = await listFactoryVacancies(tx, f.id, 1, 8);
    expect(v.items.map((x) => x.slug)).toEqual(["e2e-f-v-new", "e2e-f-v-old"]);
    expect(v).toMatchObject({ total: 2, pageCount: 1 });
    expect(v.items[1]).toMatchObject({ salary: 1500, currency: "AZN" });
    expect(await listFactoryVacancies(tx, other.id, 1, 8)).toEqual({ items: [], total: 0, pageCount: 0 });
  });
});

test("list queries use their index for ORDER BY … DESC (no Sort node: DESC columns are NULLS FIRST)", async () => {
  await inRolledBackTx(async (tx) => {
    const { f } = await seed(tx);
    await tx.execute(sql`set local enable_seqscan = off`);
    const plan = async (q: ReturnType<typeof sql>) => ((await tx.execute(q)) as unknown as { "QUERY PLAN": string }[]).map((r) => r["QUERY PLAN"]).join("\n");
    const p = await plan(sql`explain select id from products where factory_id = ${f.id} and status = 'published' order by created_at desc, id desc limit 12`);
    expect(p).toContain("products_factory_list_idx");
    expect(p).not.toMatch(/\bSort\b/);
    const v = await plan(sql`explain select id from vacancies where factory_id = ${f.id} and status = 'published' order by published_at desc, id desc limit 8`);
    expect(v).toContain("vacancies_factory_list_idx");
    expect(v).not.toMatch(/\bSort\b/);
  });
});

test("slug redirects: every language and tab; chains stay one hop; product pages follow; renaming back clears the loop", async () => {
  await inRolledBackTx(async (tx) => {
    await tx.delete(redirects).where(sql`${redirects.fromPath} like '%e2e-f-%'`);
    await recordSlugChange(tx, "e2e-f-a", "e2e-f-b");
    expect(await findRedirect(tx, "/fabrik/e2e-f-a")).toBe("/fabrik/e2e-f-b");
    expect(await findRedirect(tx, "/en/factory/e2e-f-a/products")).toBe("/en/factory/e2e-f-b/products");
    expect(await findRedirect(tx, "/ru/fabrika/e2e-f-a/vakansii")).toBe("/ru/fabrika/e2e-f-b/vakansii");
    expect(await findRedirect(tx, "/fabrik/e2e-f-a/mehsullar/1519494-ad")).toBe("/fabrik/e2e-f-b/mehsullar/1519494-ad");
    expect(await findRedirect(tx, "/fabrik/e2e-f-b")).toBeNull();

    // A → B, then B → C: A goes straight to C.
    await recordSlugChange(tx, "e2e-f-b", "e2e-f-c");
    expect(await findRedirect(tx, "/fabrik/e2e-f-a")).toBe("/fabrik/e2e-f-c");
    expect(await findRedirect(tx, "/en/factory/e2e-f-a/capabilities")).toBe("/en/factory/e2e-f-c/capabilities");
    expect(await findRedirect(tx, "/fabrik/e2e-f-b/media")).toBe("/fabrik/e2e-f-c/media");
    const targets = await tx.select({ to: redirects.toPath }).from(redirects).where(sql`${redirects.fromPath} like '%e2e-f-%'`);
    expect(targets).toHaveLength(30);
    expect(targets.every((r) => r.to.includes("e2e-f-c"))).toBe(true);

    // Back to A: A is live again (no redirect, no loop); B and C now go to A.
    await recordSlugChange(tx, "e2e-f-c", "e2e-f-a");
    expect(await findRedirect(tx, "/fabrik/e2e-f-a")).toBeNull();
    expect(await findRedirect(tx, "/fabrik/e2e-f-b/vakansiyalar")).toBe("/fabrik/e2e-f-a/vakansiyalar");
    expect(await findRedirect(tx, "/ru/fabrika/e2e-f-c")).toBe("/ru/fabrika/e2e-f-a");
    const loops = await tx.select().from(redirects).where(sql`${redirects.fromPath} = ${redirects.toPath}`);
    expect(loops).toEqual([]);
  });
});

test("dictionary slug redirects: the landing under every type and language", async () => {
  await inRolledBackTx(async (tx) => {
    await recordLandingSlugChange(tx, "e2e-f-city", "e2e-f-city-2");
    expect(await findRedirect(tx, "/fabrikler/e2e-f-city")).toBe("/fabrikler/e2e-f-city-2");
    expect(await findRedirect(tx, "/en/agroparks/e2e-f-city")).toBe("/en/agroparks/e2e-f-city-2");
    expect(await findRedirect(tx, "/ru/zavody/e2e-f-city")).toBe("/ru/zavody/e2e-f-city-2");
  });
});

test("a new factory / landing that takes an old slug back releases its redirect rows (the proxy would hide the page)", async () => {
  await inRolledBackTx(async (tx) => {
    await recordSlugChange(tx, "e2e-f-old", "e2e-f-new");
    await recordLandingSlugChange(tx, "e2e-f-town", "e2e-f-town-2");
    expect(await findRedirect(tx, "/fabrik/e2e-f-old/mehsullar/1519494-ad")).toBe("/fabrik/e2e-f-new/mehsullar/1519494-ad");
    expect(await releaseFactorySlug(tx, "e2e-f-old")).toBe(true);
    expect(await findRedirect(tx, "/fabrik/e2e-f-old")).toBeNull();
    expect(await findRedirect(tx, "/en/factory/e2e-f-old/media")).toBeNull();
    expect(await findRedirect(tx, "/fabrik/e2e-f-old/mehsullar/1519494-ad")).toBeNull();
    expect(await releaseFactorySlug(tx, "e2e-f-old")).toBe(false);
    expect(await releaseLandingSlug(tx, "e2e-f-town")).toBe(true);
    expect(await findRedirect(tx, "/ru/zavody/e2e-f-town")).toBeNull();
  });
});

test("castVote: the same voter twice → count 1 and the average follows; another voter adds; unpublished is refused", async () => {
  await inRolledBackTx(async (tx) => {
    await seed(tx);
    const one = await castVote(tx, "e2e-f-agro", "voter-a", 2);
    expect(one).toMatchObject({ avg: 2, count: 1 });
    const changed = await castVote(tx, "e2e-f-agro", "voter-a", 5);
    expect(changed).toMatchObject({ avg: 5, count: 1 });
    expect(await findVote(tx, "e2e-f-agro", "voter-a")).toBe(5);
    expect(await findVote(tx, "e2e-f-agro", "voter-b")).toBeNull();
    const two = await castVote(tx, "e2e-f-agro", "voter-b", 4);
    expect(two).toMatchObject({ avg: 4.5, count: 2 });
    const [row] = await tx.select({ avg: factories.ratingAvg, count: factories.ratingCount }).from(factories).where(eq(factories.slug, "e2e-f-agro"));
    expect(row).toEqual({ avg: 4.5, count: 2 });
    // Hidden and unknown factories cannot be rated.
    expect(await castVote(tx, "e2e-f-hidden", "voter-a", 3)).toBeNull();
    expect(await castVote(tx, "e2e-f-nope", "voter-a", 3)).toBeNull();
    expect(await findVote(tx, "e2e-f-hidden", "voter-a")).toBeNull();
    // The CHECK constraint is the last line of defence.
    await expect(castVote(tx, "e2e-f-other", "voter-a", 6)).rejects.toThrow();
  });
});
