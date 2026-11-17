// `npm run db:seed-dictionaries` — idempotent; `db:seed-content` (deploy) already includes it.
import { count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { dictCities, dictIndustries, dictProductionModels, dictProductTypes } from "../../src/db/schema";
import { seedDictionaries } from "./dictionaries-seed";

const client = postgres(process.env.DATABASE_URL!, { max: 1 });
const db = drizzle(client);

const tags = await seedDictionaries(db);

const [c] = await db.select({ n: count() }).from(dictCities);
const [i] = await db.select({ n: count() }).from(dictIndustries);
const [p] = await db.select({ n: count() }).from(dictProductTypes);
const [m] = await db.select({ n: count() }).from(dictProductionModels);
console.log(`Dictionaries ready: cities=${c.n} industries=${i.n} product_types=${p.n} production_models=${m.n}`);
console.log(tags.length > 0 ? `Cache tags invalidated: ${tags.join(", ")}` : "Nothing new inserted");
await client.end();
