// `npm run db:seed-figma` — Figma ilə vizual yoxlama üçün sabit məlumat, YALNIZ lokal baza.
// Slug-ı `figma-` ilə başlayan zavodları (və onların bütün şəkil/PDF-lərini) silir, sonra yaradır:
// - kataloq (Tapşırıq 12): 148 zavod, ilk 15-i Figma 281:7097-dəki kartlardır (figma-fixture-data.ts);
// - zavod səhifəsi (Tapşırıq 6b): "Agro Trade Supply" (figma-agro-trade-supply) və onun Media-qalereyalı nüsxəsi
//   (figma-agro-trade-supply-media): şəkillər, 8 sertifikat, 2 PDF, 120 məhsul, 10 vakansiya (figma-factory-data.ts).
// Şəkillər: design/manual-export/catalog/<imageRef> və design/manual-export/factory/<imageRef>, saveImage ilə yüklənir.
// Reytinq: `rate:*` limit sayğacları sıfırlanır (vizual yoxlama "Təşəkkür" halı üçün hər işdə 4 səs verir; limit 20/saat).
// `--conditions=react-server`: saveImage "server-only" modulunu idxal edir (package.json skripti bunu verir).
import { readFile } from "node:fs/promises";
import { eq, getTableName, inArray, like, sql } from "drizzle-orm";
import sharp from "sharp";
import { db } from "../../src/db";
import {
  dictIndustries,
  dictProductionModels,
  dictProductTypes,
  factories,
  factoryCertificates,
  factoryFiles,
  factoryImages,
  productImages,
  products,
  vacancies,
} from "../../src/db/schema";
import { deleteImage, saveImage, savePdf } from "../../src/features/media/store";
import { assertLocalDb, figmaFixtureRows, PHOTO_DIR } from "./figma-fixture-data";
import { AGRO_DICTS, AGRO_FACTORIES, AGRO_PDFS, agroProducts, agroVacancies, CERT_FRAME, CERTIFICATES, FACTORY_PHOTO_DIR } from "./figma-factory-data";

assertLocalDb(process.env.DATABASE_URL ?? "");

/** JPEG/PNG/WebP faylın MIME tipi (Figma image fill-ləri uzantısız gəlir). */
function sniff(buf: Buffer): string {
  if (buf[0] === 0xff && buf[1] === 0xd8) return "image/jpeg";
  if (buf.subarray(0, 4).toString("hex") === "89504e47") return "image/png";
  if (buf.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  throw new Error("naməlum şəkil formatı");
}

async function read(dir: string, ref: string): Promise<Buffer> {
  return readFile(`${dir}/${ref}`).catch(() => {
    throw new Error(`${dir}/${ref} yoxdur — Figma fill-ləri əvvəlcə export olunmalıdır (figma:assets)`);
  });
}

async function upload(buf: Buffer, name: string): Promise<string> {
  const saved = await saveImage(new File([new Uint8Array(buf)], name, { type: sniff(buf) }));
  if ("error" in saved) throw new Error(`${name}: saveImage → ${saved.error}`);
  return saved.id;
}

/** Kiçik, düzgün `%PDF-` faylı (yalnız ad və ölçü kartda görünür). */
function tinyPdf(title: string): Buffer {
  const body = `1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]>>endobj\n% ${title}\n`;
  return Buffer.from(`%PDF-1.4\n${body}trailer<</Root 1 0 R>>\n%%EOF\n`, "latin1");
}

// 1) köhnə fixture: zavodlar (kaskad: qalereya, sertifikat, PDF, məhsul, vakansiya, reytinq), sonra onların artıq istifadə olunmayan mediası
const oldFactories = await db.select({ id: factories.id, coverId: factories.coverId, logoId: factories.logoId }).from(factories).where(like(factories.slug, "figma-%"));
const oldIds = oldFactories.map((f) => f.id);
const oldMedia = new Set<string>(oldFactories.flatMap((f) => [f.coverId, f.logoId]).filter((v): v is string => v !== null));
if (oldIds.length) {
  const refs = await Promise.all([
    db.select({ id: factoryImages.mediaId }).from(factoryImages).where(inArray(factoryImages.factoryId, oldIds)),
    db.select({ id: factoryCertificates.mediaId }).from(factoryCertificates).where(inArray(factoryCertificates.factoryId, oldIds)),
    db.select({ id: factoryFiles.mediaId }).from(factoryFiles).where(inArray(factoryFiles.factoryId, oldIds)),
    db
      .select({ id: productImages.mediaId })
      .from(productImages)
      .innerJoin(products, eq(products.id, productImages.productId))
      .where(inArray(products.factoryId, oldIds)),
  ]);
  for (const r of refs.flat()) oldMedia.add(r.id);
}
await db.delete(factories).where(like(factories.slug, "figma-%"));
let removed = 0;
for (const id of oldMedia) if (await deleteImage(id)) removed++;

// 2) kataloq şəkilləri (hər fərqli Figma fill bir dəfə)
const rows = figmaFixtureRows();
const covers = new Map<string, string>();
for (const ref of new Set(rows.map((r) => r.photo).filter((v): v is string => v !== null))) covers.set(ref, await upload(await read(PHOTO_DIR, ref), ref));

// 3) kataloq zavodları
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

// 4) zavod səhifəsi: "Agro Trade Supply"
const factoryPhotos = new Map<string, Buffer>();
const photo = async (ref: string) => {
  if (!factoryPhotos.has(ref)) factoryPhotos.set(ref, await read(FACTORY_PHOTO_DIR, ref));
  return factoryPhotos.get(ref)!;
};
/** Bir şəkil bir dəfə yüklənir; eyni qalereyada təkrar olan şəkil (PK factory+media) ayrıca yüklənir. */
const shared = new Map<string, string>();
const sharedImage = async (ref: string) => {
  if (!shared.has(ref)) shared.set(ref, await upload(await photo(ref), ref));
  return shared.get(ref)!;
};

const dictId = async (table: string, az: string) => {
  const [row] = (await db.execute(sql`select id from ${sql.identifier(table)} where name->>'az' = ${az}`)) as unknown as { id: number }[];
  if (!row) throw new Error(`lüğətdə "${az}" yoxdur — əvvəlcə: npm run db:seed-dictionaries`);
  return row.id;
};
const industryId = await dictId(getTableName(dictIndustries), AGRO_DICTS.industry);
const productTypeId = await dictId(getTableName(dictProductTypes), AGRO_DICTS.productType);
const productionModelIds = await Promise.all(AGRO_DICTS.productionModels.map((n) => dictId(getTableName(dictProductionModels), n)));

// Sertifikatlar Figma çərçivəsində (112×159, 2x): STRETCH → fill, FIT → şəffaf kənarlı contain.
const certMedia = new Map<string, string>();
for (const c of CERTIFICATES) {
  const key = `${c.image}:${c.fit}`;
  if (certMedia.has(key)) continue;
  const png = await sharp(await photo(c.image))
    .resize(CERT_FRAME.width * 2, CERT_FRAME.height * 2, { fit: c.fit, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  certMedia.set(key, await upload(png, `${c.image}.png`));
}
const pdfMedia: string[] = [];
for (const p of AGRO_PDFS) {
  const saved = await savePdf(new File([new Uint8Array(tinyPdf(p.title))], `${p.title}.pdf`, { type: "application/pdf" }));
  if ("error" in saved) throw new Error(`${p.title}: savePdf → ${saved.error}`);
  pdfMedia.push(saved.id);
}

const agroIds: string[] = [];
for (const [k, f] of AGRO_FACTORIES.entries()) {
  const [{ id }] = await db
    .insert(factories)
    .values({
      slug: f.slug,
      type: f.type,
      name: f.name,
      legalName: f.legalName,
      about: f.about,
      equipmentText: f.equipmentText,
      employeeCount: f.employeeCount,
      capacityText: f.capacityText,
      industryId,
      productTypeId,
      productionModelIds,
      cooperation: [...f.cooperation],
      phone: f.phone,
      email: f.email,
      website: f.website,
      address: f.address,
      youtubeUrl: f.youtubeUrl,
      socials: f.socials,
      coverId: await sharedImage(f.cover),
      logoId: await sharedImage(f.logo),
      verified: f.verified,
      status: f.status,
      tariffCode: f.tariffCode,
      tariffRank: f.tariffRank,
      ratingAvg: f.ratingAvg,
      ratingCount: f.ratingCount,
      createdAt: f.createdAt,
    })
    .returning({ id: factories.id });
  agroIds.push(id);
  const seen = new Set<string>();
  const gallery: string[] = [];
  for (const ref of f.gallery) {
    gallery.push(seen.has(ref) ? await upload(await photo(ref), ref) : await sharedImage(ref));
    seen.add(ref);
  }
  await db.insert(factoryImages).values(gallery.map((mediaId, sort) => ({ factoryId: id, mediaId, sort })));
  await db.insert(factoryCertificates).values(CERTIFICATES.map((c, sort) => ({ factoryId: id, mediaId: certMedia.get(`${c.image}:${c.fit}`)!, title: c.title, sort })));
  await db.insert(factoryFiles).values(AGRO_PDFS.map((p, sort) => ({ factoryId: id, mediaId: pdfMedia[sort], title: p.title, sort })));
  if (k > 0) continue; // `-media` nüsxəsi yalnız Media tabı və reytinq səsi üçündür

  // Məhsullar (ən yenisi əvvəl) və onların şəkilləri
  for (const p of agroProducts()) {
    const [{ id: productId }] = await db
      .insert(products)
      .values({ ...(p.id ? { id: p.id } : {}), factoryId: id, slug: p.slug, name: p.name, description: p.description, status: "published", createdAt: p.createdAt })
      .returning({ id: products.id });
    const images = await Promise.all(p.images.map((ref) => sharedImage(ref)));
    await db.insert(productImages).values(images.map((mediaId, sort) => ({ productId, mediaId, sort })));
  }
  await db.insert(vacancies).values(agroVacancies().map((v) => ({ ...v, factoryId: id, status: "published" as const })));
}

// 5) reytinq limit sayğacları (yalnız lokal baza): vizual yoxlamanın səsləri saatlıq limitə ilişməsin
await db.execute(sql`delete from rate_limits where key like 'rate:%'`);

// 6) işləyən server keşi: teq-lər cache_tags-da köhnəlir, server növbəti sinxronda (≤ 3 s) tətbiq edir
const now = Date.now();
for (const tag of ["factories", ...agroIds.map((id) => `factory:${id}`)]) {
  await db.execute(sql`
    insert into cache_tags (tag, expired_at) values (${tag}, ${now}) on conflict (tag) do update set expired_at = excluded.expired_at`);
}

const [{ n }] = (await db.execute(sql`select count(*)::int as n from factories where slug like 'figma-%'`)) as unknown as { n: number }[];
const [{ p }] = (await db.execute(sql`select count(*)::int as p from products where factory_id = ${agroIds[0]}`)) as unknown as { p: number }[];
console.log(`Figma fixture hazırdır: ${n} zavod (${agroIds.length} zavod səhifəsi, ${p} məhsul), ${covers.size + shared.size} şəkil; silinən köhnə media: ${removed}`);
process.exit(0);
