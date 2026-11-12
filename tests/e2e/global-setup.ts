import { execFileSync } from "node:child_process";
import postgres from "postgres";

/** Every run starts from a known state: migrated schema, the admin from .env.local, no limits. Site settings are not reset: a prebuilt server serves build-time cached values (R24), so tests restore their own changes. */
export default async function globalSetup() {
  if (!/@(localhost|127\.0\.0\.1)[:/]/.test(process.env.DATABASE_URL ?? "")) {
    throw new Error("E2E tests only run against a local database");
  }
  execFileSync("npm", ["run", "db:migrate"], { stdio: "inherit", shell: true });
  execFileSync("npm", ["run", "db:seed-admin"], { stdio: "inherit", shell: true });
  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
  await sql`delete from rate_limits`;
  await sql`delete from sessions`;
  await sql.end();
}
