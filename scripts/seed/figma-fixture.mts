// `npm run db:seed-figma` — Figma ilə vizual yoxlama üçün sabit kataloq məlumatı (Tapşırıq 12), YALNIZ lokal baza.
// Slug-ı `figma-` ilə başlayan zavodları (və onların şəkillərini) silir, sonra 150 zavod yaradır: ilk 15-i Figma
// 281:7097-dəki kartlardır (sıra, tip, şəkil), qalanları səhifələməni "1 2 3 … 10" edir (figma-fixture-data.ts).
// Şəkillər: design/manual-export/catalog/<imageRef> (`npm run figma:assets -- --photos`), saveImage ilə yüklənir.
// `--conditions=react-server`: saveImage "server-only" modulunu idxal edir (package.json skripti bunu verir).
import { readFile } from "node:fs/promises";
import { inArray, like, sql } from "drizzle-orm";
import { db } from "../../src/db";
import { factories } from "../../src/db/schema";
import { deleteImage, saveImage } from "../../src/features/media/store";
import { assertLocalDb, figmaFixtureRows, PHOTO_DIR } from "./figma-fixture-data";

assertLocalDb(process.env.DATABASE_URL ?? "");

/** JPEG/PNG/WebP faylın MIME tipi (Figma image fill-ləri uzantısız gəlir). */
function sniff(buf: Buffer): string {
  if (buf[0] === 0xff && buf[1] === 0xd8) return "image/jpeg";
  if (buf.subarray(0, 4).toString("hex") === "89504e47") return "image/png";
  if (buf.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  throw new Error("naməlum şəkil formatı");
}

const rows = figmaFixtureRows();

// 1) köhnə fixture: zavodlar, sonra onların artıq istifadə olunmayan şəkilləri
const old = await db.select({ coverId: factories.coverId }).from(factories).where(like(factories.slug, "figma-%"));
await db.delete(factories).where(like(factories.slug, "figma-%"));
let removed = 0;
for (const id of new Set(old.map((r) => r.coverId).filter((v): v is string => v !== null))) if (await deleteImage(id)) removed++;

// 2) şəkillər (hər fərqli Figma fill bir dəfə)
const covers = new Map<string, string>();
for (const ref of new Set(rows.map((r) => r.photo).filter((v): v is string => v !== null))) {
  const buf = await readFile(`${PHOTO_DIR}/${ref}`).catch(() => {
    throw new Error(`${PHOTO_DIR}/${ref} yoxdur — əvvəlcə: npm run figma:assets -- --photos`);
  });
  const saved = await saveImage(new File([new Uint8Array(buf)], ref, { type: sniff(buf) }));
  if ("error" in saved) throw new Error(`${ref}: saveImage → ${saved.error}`);
  covers.set(ref, saved.id);
}

// 3) zavodlar
await db.insert(factories).values(
  rows.map((r) => ({
    slug: r.slug,
    type: r.type,
    name: r.name,
    about: r.about,
    coverId: r.photo ? covers.get(r.photo)! : null,
    verified: r.verified,
    status: "published" as const,
    tariffCode: r.tariffCode,
    tariffRank: r.tariffRank,
    ratingAvg: r.ratingAvg,
    ratingCount: 12,
    createdAt: r.createdAt, // 2099-dan geri: sıra üçün; updatedAt indiki an (sitemap lastmod gələcəkdə olmasın)
  })),
);

// 4) işləyən server keşi: teq-lər cache_tags-da köhnəlir, server növbəti sinxronda (≤ 3 s) tətbiq edir
const now = Date.now();
await db.execute(sql`
  insert into cache_tags (tag, expired_at) values ('factories', ${now}) on conflict (tag) do update set expired_at = excluded.expired_at`);

const [{ n }] = (await db.execute(sql`select count(*)::int as n from factories where slug like 'figma-%'`)) as unknown as { n: number }[];
const media = await db.select({ id: factories.coverId }).from(factories).where(inArray(factories.coverId, [...covers.values()]));
console.log(`Figma fixture hazırdır: ${n} zavod, ${covers.size} şəkil (${media.length} kartda); silinən köhnə şəkil: ${removed}`);
process.exit(0);
