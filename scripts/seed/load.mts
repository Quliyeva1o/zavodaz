// `npm run db:seed-load -- --count 20000` — yük testi bazası (zavod_load). Dev bazasına heç vaxt toxunmur.
import { count, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { dictCities, dictIndustries, dictProductionModels, dictProductTypes, factories } from "../../src/db/schema";
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
      createdAt: new Date(now - Math.floor(rnd() * THREE_YEARS_MS)),
    });
  }
  await db.insert(factories).values(rows);
}

await db.execute(sql`vacuum analyze`); // vacuum: görünürlük xəritəsi (index-only scan), analyze: statistika
const [{ n }] = await db.select({ n: count() }).from(factories);
console.log(`zavod_load hazırdır: ${n} zavod`);
await client.end();
