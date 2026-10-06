import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

type Database = ReturnType<typeof drizzle>;

const globalForDb = globalThis as typeof globalThis & {
  __ghostfunPool?: Pool;
  __ghostfunDb?: Database;
};

/**
 * Resolves the Postgres connection string at request time.
 *
 * Local / Node:       DATABASE_URL from .env
 * Cloudflare Workers: DATABASE_URL set via `wrangler secret put DATABASE_URL`
 *
 * Optional Hyperdrive upgrade (see DEPLOY.md): read
 * `getCloudflareContext().env.HYPERDRIVE.connectionString` here instead.
 */
function connectionString(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Locally add it to .env; on Cloudflare run `npx wrangler secret put DATABASE_URL`.",
    );
  }
  return url;
}

/**
 * Created lazily so importing this module never throws during a build —
 * Cloudflare Workers evaluate modules without request-scoped env available.
 */
function getDatabase(): Database {
  if (globalForDb.__ghostfunDb) return globalForDb.__ghostfunDb;
  const pool =
    globalForDb.__ghostfunPool ??
    new Pool({
      connectionString: connectionString(),
      // Workers are short-lived and highly concurrent: keep the pool small.
      max: Number(process.env.DATABASE_POOL_MAX) || 3,
      connectionTimeoutMillis: 10_000,
    });
  const database = drizzle(pool);
  globalForDb.__ghostfunPool = pool;
  globalForDb.__ghostfunDb = database;
  return database;
}

export const db = new Proxy({} as Database, {
  get(_target, property) {
    const instance = getDatabase() as unknown as Record<string | symbol, unknown>;
    const value = instance[property];
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
