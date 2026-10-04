import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  // Do not crash at import time: the process (and /api/healthz) must be able to start.
  // Database-backed routes will return errors until DATABASE_URL is configured.
  console.error("DATABASE_URL is not set. Database-backed API routes will fail until it is configured.");
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });

export * from "./schema";
