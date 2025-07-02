import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import alasql from "alasql";

export const taskWishPackages = sqliteTable("package", {
  id: text("id").primaryKey(),
  name: text("name"),
  description: text("description"),
  main: text("main"),
  createdAt: text("created_at")
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at"),
});

alasql(`CREATE TABLE package (
  id STRING,
  name STRING,
  description STRING,
  main STRING,
  created_at STRING,
  updated_at STRING
)`);
