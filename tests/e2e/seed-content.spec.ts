import { expect, test } from "@playwright/test";
import { eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { seedContent } from "../../scripts/seed/content-seed";
import { cacheTags, pages, siteSettings } from "../../src/db/schema";

// Database only (no browser): everything runs inside a transaction that is rolled back.
const client = postgres(process.env.DATABASE_URL!, { max: 1 });
const db = drizzle(client);
test.afterAll(() => client.end());

class Rollback extends Error {}

async function inRolledBackTx(fn: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<void>) {
  await expect(
    db.transaction(async (tx) => {
      await fn(tx);
      throw new Rollback();
    }),
  ).rejects.toBeInstanceOf(Rollback);
}

test("content seed is idempotent: a seeded database inserts nothing and invalidates nothing", async () => {
  await inRolledBackTx(async (tx) => {
    await seedContent(tx);
    expect(await seedContent(tx)).toEqual([]);
  });
});

test("content seed invalidates the cache tags of the rows it inserted", async () => {
  await inRolledBackTx(async (tx) => {
    await seedContent(tx);
    await tx.delete(pages).where(eq(pages.key, "help"));
    await tx.delete(siteSettings).where(eq(siteSettings.key, "contact"));
    const before = Date.now();
    const tags = await seedContent(tx);
    expect(tags.sort()).toEqual(["contact", "page:help"]);
    const rows = await tx.select().from(cacheTags).where(inArray(cacheTags.tag, tags));
    expect(rows).toHaveLength(2);
    for (const row of rows) expect(row.expiredAt).toBeGreaterThanOrEqual(before);
  });
});
