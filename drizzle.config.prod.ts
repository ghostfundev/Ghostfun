import { defineConfig } from "drizzle-kit";

/**
 * Pushes the schema to your PRODUCTION database.
 *
 *   DATABASE_URL="postgresql://..." npx drizzle-kit push --config=drizzle.config.prod.ts
 *
 * Use the direct (non-pooled) connection string here — migrations should not
 * go through PgBouncer or Hyperdrive.
 */
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
});
