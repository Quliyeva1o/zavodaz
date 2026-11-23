// `npm run media:sweep` — deletes uploads nobody references that are older than 24 h (abandoned admin forms).
// Daily cron on the server: see deploy/cpanel/README.md. UPLOAD_DIR must be set explicitly (no guessing which
// directory to delete from).
import path from "node:path";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sweepOrphanMedia } from "../../src/features/media/sweep";

const uploadDir = process.env.UPLOAD_DIR;
if (!process.env.DATABASE_URL || !uploadDir) {
  console.error("DATABASE_URL və UPLOAD_DIR təyin olunmalıdır");
  process.exit(1);
}

const client = postgres(process.env.DATABASE_URL, { max: 1 });
try {
  const deleted = await sweepOrphanMedia(drizzle(client), path.resolve(uploadDir));
  console.log(`${new Date().toISOString()} media sweep: ${deleted} istifadə olunmayan şəkil silindi`);
} finally {
  await client.end();
}
