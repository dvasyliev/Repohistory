import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle } from "drizzle-orm/d1";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import type { SqliteRemoteDatabase } from "drizzle-orm/sqlite-proxy";
import * as schema from "./schema";

export type Db = BaseSQLiteDatabase<"async", unknown, typeof schema> &
  Pick<SqliteRemoteDatabase<typeof schema>, "batch">;

export function getDb(): Db {
  return drizzle(getCloudflareContext().env.DB, { schema });
}
