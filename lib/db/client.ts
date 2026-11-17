import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle } from "drizzle-orm/d1";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import * as schema from "./schema";

export type Db = BaseSQLiteDatabase<"async", unknown, typeof schema>;

export function getDb(): Db {
  return drizzle(getCloudflareContext().env.DB, { schema });
}
