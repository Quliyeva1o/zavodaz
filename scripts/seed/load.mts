// `npm run db:seed-load -- --count 20000` — yük testi bazası (zavod_load). Dev bazasına heç vaxt toxunmur.
import { count, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { dictCities, dictIndustries, dictProductionModels, dictProductTypes, factories, products, ratings, redirects, vacancies } from "../../src/db/schema";
import { COOPERATION, FACTORY_TYPES } from "../../src/features/catalog/types";
import { seedDictionaries } from "./dictionaries-seed";
import { assertLoadDb, mulberry32, withDatabase } from "./load-lib";

const BATCH = 1000;
const THREE_YEARS_MS = 3 * 365 * 24 * 3600 * 1000;

const arg = process.argv.indexOf("--count");
const total = arg > -1 ? Number(process.argv[arg + 1]) : 20000;
if (!Number.isInteger(total) || total < 1) throw new Error("--count müsbət tam ədəd olmalıdır");

const base = process.env.LOAD_DATABASE_URL ?? (process.env.DATABASE_URL ? withDatabase(process.env.DATABASE_URL, "zavod_load") : "");
assertLoadDb(base);

// 1) baza yoxdursa yarat (server səviyyəsində `postgres` bazasına qoşulmaqla)
const admin = postgres(withDatabase(base, "postgres"), { max: 1 });
const exists = await admin`select 1 from pg_database where datname = 'zavod_load'`;
if (exists.length === 0) await admin.unsafe("create database zavod_load");
await admin.end();

const client = postgres(base, { max: 1 });
const db = drizzle(client);

// 2) miqrasiyalar + lüğətlər
await migrate(db, { migrationsFolder: "./drizzle" });
await seedDictionaries(db);

type DictTable = typeof dictCities | typeof dictIndustries | typeof dictProductTypes | typeof dictProductionModels;
const ids = async (table: DictTable) => (await db.select({ id: (table as typeof dictCities).id }).from(table as typeof dictCities)).map((r) => r.id);
const [cityIds, industryIds, productTypeIds, modelIds] = await Promise.all([
  ids(dictCities),
  ids(dictIndustries),
  ids(dictProductTypes),
  ids(dictProductionModels),
]);

// 3) zavodlar (deterministik)
await db.execute(sql`truncate table ${factories} restart identity cascade`);
const rnd = mulberry32(42);
const pick = <T,>(list: readonly T[]): T => list[Math.floor(rnd() * list.length)];
const subset = <T,>(list: readonly T[], max: number): T[] => {
  const n = Math.floor(rnd() * (max + 1));
  const pool = [...list];
  const out: T[] = [];
  for (let i = 0; i < n && pool.length; i++) out.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
  return out.sort();
};
const now = Date.now();

for (let start = 0; start < total; start += BATCH) {
  const rows = [];
  for (let i = start; i < Math.min(start + BATCH, total); i++) {
    const tr = rnd();
    const tariff = tr < 0.05 ? "vip" : tr < 0.15 ? "premium" : "standart";
    const sr = rnd();
    rows.push({
      type: pick(FACTORY_TYPES),
      slug: `load-${i + 1}`,
      name: `Yük zavodu ${i + 1}`,
      about: `Yük testi üçün sınaq zavodu nömrə ${i + 1}.`,
      cityId: pick(cityIds),
      industryId: pick(industryIds),
      productTypeId: pick(productTypeIds),
      productionModelIds: subset(modelIds, 3),
      cooperation: subset(COOPERATION, 2),
      verified: rnd() < 0.6,
      status: sr < 0.85 ? ("published" as const) : sr < 0.93 ? ("draft" as const) : ("hidden" as const),
      tariffCode: tariff,
      tariffRank: tariff === "vip" ? 2 : tariff === "premium" ? 1 : 0,
      ratingAvg: Math.round(rnd() * 50) / 10,
      ratingCount: Math.floor(rnd() * 200),
      equipmentText: rnd() < 0.5 ? `Avadanlıq siyahısı ${i + 1}.
`.repeat(1 + Math.floor(rnd() * 8)) : "",
      employeeCount: rnd() < 0.7 ? 5 + Math.floor(rnd() * 500) : null,
      capacityText: rnd() < 0.5 ? `Gündə ${10 + Math.floor(rnd() * 90)} ton` : "",
      phone: rnd() < 0.8 ? `+994 50 ${String(1000000 + i).slice(-7)}` : "",
      email: rnd() < 0.8 ? `info${i + 1}@yuk.example` : "",
      website: rnd() < 0.5 ? `https://yuk${i + 1}.example` : "",
      address: rnd() < 0.8 ? `Yük küçəsi ${i + 1}` : "",
      createdAt: new Date(now - Math.floor(rnd() * THREE_YEARS_MS)),
    });
  }
  await db.insert(factories).values(rows);
}

// 4) məhsullar (hər dərc olunmuş zavoda 0–30, ~90% published, şəkilsiz), vakansiyalar (0–5, bəziləri bitmiş), yönləndirmələr, reytinqlər
await db.execute(sql`truncate table ${redirects}`);
const pubFactories = await db.select({ id: factories.id, slug: factories.slug }).from(factories).where(eq(factories.status, "published")).orderBy(factories.slug);
const statusOf = (): "published" | "draft" | "hidden" => {
  const r = rnd();
  return r < 0.9 ? "published" : r < 0.96 ? "draft" : "hidden";
};
let productRows: (typeof products.$inferInsert)[] = [];
let vacancyRows: (typeof vacancies.$inferInsert)[] = [];
let productTotal = 0;
let vacancyTotal = 0;
const flush = async (force: boolean) => {
  if (productRows.length >= BATCH || (force && productRows.length)) {
    await db.insert(products).values(productRows);
    productTotal += productRows.length;
    productRows = [];
  }
  if (vacancyRows.length >= BATCH || (force && vacancyRows.length)) {
    await db.insert(vacancies).values(vacancyRows);
    vacancyTotal += vacancyRows.length;
    vacancyRows = [];
  }
};
const DAY = 24 * 3600 * 1000;
for (const f of pubFactories) {
  const n = Math.floor(rnd() * 31);
  for (let k = 0; k < n; k++) {
    productRows.push({
      factoryId: f.id,
      slug: `mehsul-${k + 1}`,
      name: `Məhsul ${k + 1} (${f.slug})`,
      description: rnd() < 0.7 ? "Yük testi üçün sınaq məhsulu. ".repeat(1 + Math.floor(rnd() * 5)) : "",
      status: statusOf(),
      createdAt: new Date(now - Math.floor(rnd() * THREE_YEARS_MS)),
    });
  }
  const v = Math.floor(rnd() * 6);
  for (let k = 0; k < v; k++) {
    const expired = rnd() < 0.3;
    vacancyRows.push({
      factoryId: f.id,
      slug: `${f.slug}-vak-${k + 1}`,
      title: `Vakansiya ${k + 1}`,
      cityId: pick(cityIds),
      salary: rnd() < 0.6 ? 500 + Math.floor(rnd() * 20) * 100 : null,
      employmentType: pick(["full", "part", "contract"]),
      publishedAt: new Date(now - Math.floor(rnd() * 120 * DAY)),
      expiresAt: expired ? new Date(now - Math.floor(rnd() * 30 * DAY)) : rnd() < 0.5 ? new Date(now + 30 * DAY) : null,
      status: rnd() < 0.9 ? "published" : "draft",
    });
  }
  await flush(false);
}
await flush(true);

// köhnə slug yönləndirmələri (proxy-nin yaddaşa yüklədiyi xəritə)
const REDIRECTS = 5000;
for (let start = 0; start < REDIRECTS; start += BATCH) {
  const rows = [];
  for (let i = start; i < Math.min(start + BATCH, REDIRECTS); i++) {
    rows.push({ fromPath: `/az/zavodlar/kohne-load-${i + 1}`, toPath: `/az/zavodlar/load-${i + 1}` });
  }
  await db.insert(redirects).values(rows);
}

// castVote aqreqatı üçün: ilk dərc olunmuş zavoda ~2000 səs
const RATINGS = 2000;
const rated = pubFactories[0];
for (let start = 0; start < RATINGS; start += BATCH) {
  const rows = [];
  for (let i = start; i < Math.min(start + BATCH, RATINGS); i++) rows.push({ factoryId: rated.id, voterHash: `load-voter-${String(i).padStart(5, "0")}`, score: 1 + Math.floor(rnd() * 5) });
  await db.insert(ratings).values(rows);
}
// qalan zavodlara 1–3 səs: ratings cədvəli real paylanmaya malik olsun (bir zavod bütün cədvəl olmasın)
let otherRatings = 0;
for (let start = 1; start < pubFactories.length; start += 400) {
  const rows = [];
  for (const f of pubFactories.slice(start, start + 400)) {
    const n = 1 + Math.floor(rnd() * 3);
    for (let k = 0; k < n; k++) rows.push({ factoryId: f.id, voterHash: `load-other-${k}`, score: 1 + Math.floor(rnd() * 5) });
  }
  await db.insert(ratings).values(rows);
  otherRatings += rows.length;
}
await db.update(factories).set({ ratingCount: RATINGS }).where(eq(factories.id, rated.id));

await db.execute(sql`vacuum analyze`); // vacuum: görünürlük xəritəsi (index-only scan), analyze: statistika
const [{ n }] = await db.select({ n: count() }).from(factories);
console.log(`zavod_load hazırdır: ${n} zavod, ${productTotal} məhsul, ${vacancyTotal} vakansiya, ${REDIRECTS} yönləndirmə, ${RATINGS}+${otherRatings} reytinq (zavod ${rated.slug})`);
await client.end();
