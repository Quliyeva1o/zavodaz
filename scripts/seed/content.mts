// `npm run db:seed-content` — idempotent, runs on every deploy before the build (deploy/cpanel/deploy.sh).
import { count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { faqItems, pages, siteSettings, tariffPlans } from "../../src/db/schema";
import { seedContent } from "./content-seed";

const client = postgres(process.env.DATABASE_URL!, { max: 1 });
const db = drizzle(client);

const tags = await seedContent(db);

const [p] = await db.select({ n: count() }).from(pages);
const [t] = await db.select({ n: count() }).from(tariffPlans);
const [f] = await db.select({ n: count() }).from(faqItems);
const [s] = await db.select({ n: count() }).from(siteSettings);
console.log(`Content ready: pages=${p.n} tariff_plans=${t.n} faq_items=${f.n} site_settings=${s.n}`);
console.log(tags.length > 0 ? `Cache tags invalidated: ${tags.join(", ")}` : "Nothing new inserted");
await client.end();
