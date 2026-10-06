import { jsonb, pgTable, serial, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";

export const watchlistItems = pgTable(
  "watchlist_items",
  {
    id: serial("id").primaryKey(),
    visitorId: varchar("visitor_id", { length: 80 }).notNull(),
    token: varchar("token", { length: 128 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("watchlist_visitor_token_idx").on(table.visitorId, table.token)],
);

export const launchDrafts = pgTable("launch_drafts", {
  visitorId: varchar("visitor_id", { length: 80 }).primaryKey(),
  draft: jsonb("draft").$type<Record<string, unknown>>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
