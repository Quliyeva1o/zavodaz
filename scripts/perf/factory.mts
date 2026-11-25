// `npm run perf:factory` — 3-cü addım (zavod səhifəsi, məhsullar, vakansiyalar, reytinq, sitemap) sorğularının real SQL-i
// zavod_load bazasında EXPLAIN (ANALYZE, BUFFERS) ilə. Hər sorğu 5 dəfə; birinci və median çap olunur.
// Hədəf: hər ifadə ≤ 50 ms; böyük cədvəllərdə (factories, products, vacancies, ratings) seq scan yoxdur,
// yalnız `allowSeq` ilə işarələnmiş sənədləşdirilmiş aqreqatlar istisnadır.
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { redirects } from "../../src/db/schema";
import { findFactoryBySlug, findProduct, findProductSlug, listFactoryProducts, listFactoryVacancies, listSimilarProducts } from "../../src/features/factory/factory-sql";
import { castVote } from "../../src/features/factory/rating-sql";
import { countSitemapFactories, countSitemapProducts, listSitemapFactories, listSitemapProducts } from "../../src/features/factory/sitemap-sql";
import { PRODUCTS_PAGE_SIZE, SIMILAR_PRODUCTS, VACANCIES_PAGE_SIZE } from "../../src/features/factory/types";
import type { AnyPgDb } from "../../src/lib/cache/tag-store";
import { assertLoadDb, withDatabase } from "../seed/load-lib";

const RUNS = 5;
const TARGET_MS = 50;
const BIG = new Set(["factories", "products", "vacancies", "ratings"]);

const url = process.env.LOAD_DATABASE_URL ?? (process.env.DATABASE_URL ? withDatabase(process.env.DATABASE_URL, "zavod_load") : "");
assertLoadDb(url);

type Captured = { query: string; params: unknown[] };
let captured: Captured[] = [];
const client = postgres(url, { max: 1, prepare: true });
const db = drizzle(client, { logger: { logQuery: (query, params) => void captured.push({ query, params }) } });
const adb = db as unknown as AnyPgDb;

// Nümunə məlumat: ən çox dərc olunmuş məhsulu olan zavod; səs verilmiş zavod (slug sırasında birinci).
const [top] = await client`
  select f.id, f.slug, p.n from factories f
  join (select factory_id, count(*)::int n from products where status = 'published' group by factory_id order by 2 desc limit 1) p on p.factory_id = f.id`;
const [rated] = await client`select slug from factories where status = 'published' order by slug limit 1`;
const [withVac] = await client`
  select f.id from factories f join (select factory_id from vacancies where status = 'published' group by factory_id order by count(*) desc limit 1) v on v.factory_id = f.id`;
if (!top || !rated || !withVac) throw new Error("yük bazası boşdur: əvvəl `npm run db:seed-load` işlədin");
const productCount = (await client`select count(*)::int n from products p join factories f on f.id = p.factory_id where p.status = 'published' and f.status = 'published'`)[0].n as number;
const lastChunk = Math.floor((productCount - 1) / 16_666);
const [mid] = await client`select id from products where factory_id = ${top.id} and status = 'published' order by id offset 5 limit 1`;
const code = Number(mid.id);
const deepPage = Math.max(1, Math.ceil(top.n / PRODUCTS_PAGE_SIZE));

// `budget`: yalnız sənədləşdirilmiş aqreqatlar üçün (docs/perf/addim-3-zavod.md); qalanı TARGET_MS.
type Case = { name: string; run: () => Promise<unknown>; allowSeq?: string; budget?: number };
const cases: Case[] = [
  { name: "zavod slug-la (əsas səhifə)", run: () => findFactoryBySlug(adb, top.slug) },
  { name: "Məhsullar tabı, səhifə 1", run: () => listFactoryProducts(adb, top.id, 1, PRODUCTS_PAGE_SIZE) },
  { name: `Məhsullar tabı, dərin səhifə (${deepPage})`, run: () => listFactoryProducts(adb, top.id, deepPage, PRODUCTS_PAGE_SIZE) },
  { name: "məhsul koda görə", run: () => findProduct(adb, top.id, code) },
  { name: "oxşar məhsullar", run: () => listSimilarProducts(adb, top.id, code, SIMILAR_PRODUCTS) },
  { name: "Vakansiyalar tabı, səhifə 1", run: () => listFactoryVacancies(adb, withVac.id, 1, VACANCIES_PAGE_SIZE) },
  { name: "findProductSlug (proxy)", run: () => findProductSlug(adb, top.slug, code) },
  { name: "yönləndirmə xəritəsi yükü", run: () => db.select({ from: redirects.fromPath, to: redirects.toPath }).from(redirects), allowSeq: "redirects" },
  { name: "sitemap: zavod sayı", run: () => countSitemapFactories(adb), allowSeq: "factories" },
  { name: "sitemap: zavod, 1-ci 16 666", run: () => listSitemapFactories(adb, 0), allowSeq: "factories" },
  { name: "sitemap: məhsul sayı", run: () => countSitemapProducts(adb), allowSeq: "products" },
  { name: "sitemap: məhsul, 1-ci 16 666", run: () => listSitemapProducts(adb, 0), allowSeq: "products" },
  { name: `sitemap: məhsul, son hissə (${lastChunk})`, run: () => listSitemapProducts(adb, lastChunk), allowSeq: "products,factories", budget: 250 },
  { name: "castVote (zavod ~2000 səs, tranzaksiya)", run: () => castVote(adb, rated.slug, "load-voter-00007", 4, "load-ip-00007") },
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
  const wall: number[] = [];
  let stmts: Captured[] = [];
  for (let i = 0; i < RUNS; i++) {
    captured = [];
    const t0 = performance.now();
    await c.run();
    wall.push(performance.now() - t0);
    if (i === 0) stmts = captured.slice();
  }
  // EXPLAIN yalnız SELECT-lər üçün (yazı ifadələri məlumatı dəyişərdi); castVote-un aqreqat SELECT-i daxildir.
  const parts: string[] = [];
  let worst = 0;
  let seqBad = false;
  for (const s of stmts.filter((x) => /^\s*select/i.test(x.query))) {
    const exec: number[] = [];
    const info = { indexes: new Set<string>(), seq: new Set<string>() };
    for (let i = 0; i < RUNS; i++) {
      const res = await client.unsafe(`explain (analyze, buffers, format json) ${s.query}`, s.params as never[]);
      const plan = (res[0] as unknown as { "QUERY PLAN": { Plan: Node; "Execution Time": number }[] })["QUERY PLAN"][0];
      exec.push(plan["Execution Time"]);
      if (i === 0) walk(plan.Plan, info);
    }
    worst = Math.max(worst, median(exec));
    for (const r of info.seq) if (BIG.has(r) && !c.allowSeq?.split(",").includes(r)) seqBad = true;
    const from = /from "(\w+)"/i.exec(s.query)?.[1] ?? "?";
    parts.push(
      `${from}: ilk ${fmt(exec[0])} / median ${fmt(median(exec))} ms; indeks: ${[...info.indexes].join(", ") || "-"}${info.seq.size ? `; seq scan: ${[...info.seq].join(", ")}` : ""}`,
    );
  }
  const ok = worst <= (c.budget ?? TARGET_MS) && !seqBad; // divar vaxtı (bağlantı gediş-gəlişi) məlumat üçündür, qapı SQL vaxtıdır
  if (!ok) failed++;
  console.log(`${ok ? "OK  " : "FAIL"} ${c.name}\n     tətbiq (divar): ilk ${fmt(wall[0])} / median ${fmt(median(wall))} ms\n${parts.map((p) => `     ${p}`).join("\n")}`);
  rows.push(`${c.name} | ${fmt(wall[0])} | ${fmt(median(wall))} | ${parts.join("<br>")}`);
}
console.log(`\n--- markdown ---\n${rows.map((r) => `| ${r} |`).join("\n")}`);
console.log(`\nnümunə: zavod ${top.slug} (${top.n} dərc olunmuş məhsul), ${productCount} sitemap məhsulu, səs zavodu ${rated.slug}`);
console.log(failed ? `\n${failed} sorğu hədəfi keçmədi` : "\nBütün sorğular hədəf daxilindədir");
await client.end();
process.exitCode = failed ? 1 : 0;
