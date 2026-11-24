import { expect, test } from "@playwright/test";
import { access, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { factories, factoryCertificates, factoryFiles, factoryImages, media, productImages, products } from "../../src/db/schema";
import { deleteUnreferencedMedia, sweepOrphanMedia } from "../../src/features/media/sweep";

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
          kind: "image" as const,
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

test("every column that points at media keeps the upload: logo, gallery, certificates, PDF files, product images", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "zavod-sweep-refs-"));
  const now = new Date("2026-11-23T12:00:00Z");
  const id = (n: number) => `e2e00000-0000-4000-8000-0000000001${String(n).padStart(2, "0")}`;
  const used = { logo: id(1), gallery: id(2), certificate: id(3), pdf: id(4), product: id(5) };
  const orphan = id(9);
  try {
    const outcome = await db
      .transaction(async (tx) => {
        const old = new Date(now.getTime() - 30 * 3600_000);
        const row = (mid: string, kind: "image" | "pdf" = "image") =>
          kind === "pdf"
            ? { id: mid, kind, width: 0, height: 0, variants: [], blur: "", size: 1234, createdAt: old }
            : { id: mid, kind, width: 320, height: 200, variants: [320], blur: "data:image/webp;base64,", size: 1, createdAt: old };
        await tx.insert(media).values([row(used.logo), row(used.gallery), row(used.certificate), row(used.pdf, "pdf"), row(used.product), row(orphan, "pdf")]);
        const [f] = await tx.insert(factories).values({ type: "fabrik", slug: "e2e-sweep-refs", name: "E2E Refs", logoId: used.logo }).returning();
        await tx.insert(factoryImages).values({ factoryId: f.id, mediaId: used.gallery, sort: 0 });
        await tx.insert(factoryCertificates).values({ factoryId: f.id, mediaId: used.certificate, title: "ISO 9001" });
        await tx.insert(factoryFiles).values({ factoryId: f.id, mediaId: used.pdf, title: "Kataloq" });
        const [p] = await tx.insert(products).values({ factoryId: f.id, slug: "e2e-mehsul", name: "E2E Məhsul" }).returning();
        await tx.insert(productImages).values({ productId: p.id, mediaId: used.product, sort: 0 });

        for (const mid of Object.values(used)) expect(await deleteUnreferencedMedia(tx, dir, mid), mid).toBe(false);
        await sweepOrphanMedia(tx, dir, { now });
        const left = (await tx.select({ id: media.id }).from(media)).map((r) => r.id);
        expect(left).toEqual(expect.arrayContaining(Object.values(used)));
        expect(left).not.toContain(orphan);
        throw new Rollback();
      })
      .catch((e: unknown) => e);
    if (!(outcome instanceof Rollback)) throw outcome;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
