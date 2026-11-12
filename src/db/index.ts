import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { databaseUrl } from "@/lib/env";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { pg?: ReturnType<typeof postgres> };

// One pool per process (≤10 connections: shared hosting limit); reused across hot reloads in dev.
const client = globalForDb.pg ?? postgres(databaseUrl, { max: 10, idle_timeout: 20, prepare: true });
if (process.env.NODE_ENV !== "production") globalForDb.pg = client;

export const db = drizzle(client, { schema });
