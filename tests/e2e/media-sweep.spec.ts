import { expect, test } from "@playwright/test";
import { access, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { factories, media } from "../../src/db/schema";
import { sweepOrphanMedia } from "../../src/features/media/sweep";

// Database only (no browser). Rows live in a rolled-back transaction; files in a temporary directory, so neither the
// dev database nor the real UPLOAD_DIR is touched.
const client = postgres(process.env.DATABASE_URL!, { max: 1 });
const db = drizzle(client);
test.afterAll(() => client.end());

class Rollback extends Error {}
const exists = (p: string) => access(p).then(() => true, () => false);

test("orphan sweep deletes unreferenced uploads older than 24 h (row + directory) and keeps the rest", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "zavod-sweep-"));
  const now = new Date("2026-11-23T12:00:00Z");
  const ids = {
    oldOrphan: "e2e00000-0000-4000-8000-000000000001",
    oldUsed: "e2e00000-0000-4000-8000-000000000002",
    freshOrphan: "e2e00000-0000-4000-8000-000000000003",
  };
  for (const id of Object.values(ids)) {
    await mkdir(path.join(dir, id));
    await writeFile(path.join(dir, id, "320.webp"), "x");
  }
  try {
    const outcome = await db
      .transaction(async (tx) => {
        const row = (id: string, hoursAgo: number) => ({
          id,
          kind: "image",
          width: 320,
          height: 200,
          variants: [320],
          blur: "data:image/webp;base64,",
          size: 1,
          createdAt: new Date(now.getTime() - hoursAgo * 3600_000),
        });
        await tx.insert(media).values([row(ids.oldOrphan, 30), row(ids.oldUsed, 30), row(ids.freshOrphan, 2)]);
        await tx.insert(factories).values({ type: "fabrik", slug: "e2e-sweep", name: "E2E Sweep", coverId: ids.oldUsed });
        // Other old orphans of the dev database (if any) are also deleted inside this transaction — and rolled back.
        expect(await sweepOrphanMedia(tx, dir, { now })).toBeGreaterThanOrEqual(1);
        const left = (await tx.select({ id: media.id }).from(media)).map((r) => r.id);
        expect(left).not.toContain(ids.oldOrphan);
        expect(left).toEqual(expect.arrayContaining([ids.oldUsed, ids.freshOrphan]));
        throw new Rollback();
      })
      .catch((e: unknown) => e);
    if (!(outcome instanceof Rollback)) throw outcome;
    expect(await exists(path.join(dir, ids.oldOrphan))).toBe(false);
    expect(await exists(path.join(dir, ids.oldUsed, "320.webp"))).toBe(true);
    expect(await exists(path.join(dir, ids.freshOrphan, "320.webp"))).toBe(true);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
