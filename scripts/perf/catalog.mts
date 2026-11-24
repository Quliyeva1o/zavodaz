// `npm run perf:catalog` — kataloq sorğularının real SQL-i (catalog-sql.ts) zavod_load bazasında EXPLAIN (ANALYZE, BUFFERS) ilə.
// Hər sorğu 5 dəfə; birinci və median çap olunur. Hədəf: ≤ 50 ms, factories üzərində seq scan yoxdur.
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { dictCities, dictIndustries, dictProductionModels, dictProductTypes } from "../../src/db/schema";
import { buildCatalogQuery, buildLandingCounts, resolveCatalogIds } from "../../src/features/catalog/catalog-sql";
import type { CatalogFilter, Dictionaries } from "../../src/features/catalog/types";
import { assertLoadDb, withDatabase } from "../seed/load-lib";

const RUNS = 5;
const TARGET_MS = 50;

const url = process.env.LOAD_DATABASE_URL ?? (process.env.DATABASE_URL ? withDatabase(process.env.DATABASE_URL, "zavod_load") : "");
assertLoadDb(url);

type Captured = { query: string; params: unknown[] };
let captured: Captured[] = [];
const client = postgres(url, { max: 1, prepare: true });
const db = drizzle(client, { logger: { logQuery: (query, params) => void captured.push({ query, params }) } });

type DictTable = typeof dictCities | typeof dictIndustries | typeof dictProductTypes | typeof dictProductionModels;
const dict = async (table: DictTable) => {
  const t = table as typeof dictCities;
  return (await db.select({ id: t.id, slug: t.slug }).from(t).orderBy(t.id)).map((r) => ({ ...r, name: { az: r.slug } }));
};
const dicts = {
  cities: await dict(dictCities),
  industries: await dict(dictIndustries),
  productTypes: await dict(dictProductTypes),
  productionModels: await dict(dictProductionModels),
} as unknown as Dictionaries;

const base: CatalogFilter = {
  types: [], industry: null, city: null, product: null, model: null, coop: null, recommended: false, sort: "default", page: 1,
};
const city = dicts.cities.find((c) => c.slug === "baki")?.slug ?? dicts.cities[0].slug;
const industry = dicts.industries[0].slug;
const model = dicts.productionModels[0].slug;

const cases: { name: string; filter?: CatalogFilter; landing?: true }[] = [
  { name: "default, səhifə 1", filter: base },
  { name: "default, səhifə 50", filter: { ...base, page: 50 } },
  { name: "tip (fabrik)", filter: { ...base, types: ["fabrik"] } },
  { name: "tip + şəhər", filter: { ...base, types: ["fabrik"], city } },
  { name: "model (@>)", filter: { ...base, model } },
  { name: "əməkdaşlıq (coop)", filter: { ...base, coop: "distributor" } },
  { name: "rating_desc", filter: { ...base, sort: "rating_desc" } },
  { name: "rating_asc", filter: { ...base, sort: "rating_asc" } },
  { name: "tövsiyə edilənlər", filter: { ...base, recommended: true } },
  { name: "landing (tip + sahə)", filter: { ...base, types: ["zavod"], industry } },
  { name: "landing sayları", landing: true },
];

const median = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
const fmt = (n: number) => n.toFixed(2);

type Node = { "Node Type": string; "Relation Name"?: string; "Index Name"?: string; Plans?: Node[] };
function walk(n: Node, out: { indexes: Set<string>; seq: Set<string> }) {
  if (n["Index Name"]) out.indexes.add(n["Index Name"]);
  if (n["Node Type"] === "Seq Scan" && n["Relation Name"]) out.seq.add(n["Relation Name"]);
  n.Plans?.forEach((p) => walk(p, out));
}

const rows: string[] = [];
let failed = 0;
for (const c of cases) {
  // 1) tətbiqin real funksiyası: divar saatı (cache-siz, list + count paralel)
  const wall: number[] = [];
  let stmts: Captured[] = [];
  for (let i = 0; i < RUNS; i++) {
    captured = [];
    const t0 = performance.now();
    if (c.landing) await buildLandingCounts(db);
    else {
      const ids = resolveCatalogIds(c.filter!, dicts);
      if (!ids) throw new Error(`naməlum slug: ${c.name}`);
      await buildCatalogQuery(db, c.filter!, ids);
    }
    wall.push(performance.now() - t0);
    if (i === 0) stmts = captured.slice();
  }
  // 2) hər ifadə üçün EXPLAIN
  const parts: string[] = [];
  let worst = 0;
  let seq = false;
  for (const s of stmts) {
    const label = /count\(/i.test(s.query) && !/group by/i.test(s.query) ? "say" : /group by/i.test(s.query) ? "qrup" : "siyahı";
    const exec: number[] = [];
    const info = { indexes: new Set<string>(), seq: new Set<string>() };
    for (let i = 0; i < RUNS; i++) {
      const res = await client.unsafe(`explain (analyze, buffers, format json) ${s.query}`, s.params as never[]);
      const plan = (res[0] as unknown as { "QUERY PLAN": { Plan: Node; "Execution Time": number }[] })["QUERY PLAN"][0];
      exec.push(plan["Execution Time"]);
      if (i === 0) walk(plan.Plan, info);
    }
    worst = Math.max(worst, median(exec));
    // qrup (landing sayları): bütün cədvəl üzrə aqreqatdır, seq scan düzgün plandır; yalnız vaxt hədəfi yoxlanır.
    if (info.seq.has("factories") && label !== "qrup") seq = true;
    parts.push(
      `${label}: ilk ${fmt(exec[0])} / median ${fmt(median(exec))} ms; indeks: ${[...info.indexes].join(", ") || "-"}${info.seq.size ? `; SEQ SCAN: ${[...info.seq].join(", ")}` : ""}`,
    );
  }
  const ok = worst <= TARGET_MS && !seq;
  if (!ok) failed++;
  console.log(`${ok ? "OK  " : "FAIL"} ${c.name}\n     tətbiq (divar): ilk ${fmt(wall[0])} / median ${fmt(median(wall))} ms\n${parts.map((p) => `     ${p}`).join("\n")}`);
  rows.push(`${c.name} | ${fmt(wall[0])} | ${fmt(median(wall))} | ${parts.join("<br>")}`);
}
console.log(`\n--- markdown ---\n${rows.map((r) => `| ${r} |`).join("\n")}`);
console.log(failed ? `\n${failed} sorğu hədəfi keçmədi` : "\nBütün sorğular hədəf daxilindədir");
await client.end();
process.exitCode = failed ? 1 : 0;
