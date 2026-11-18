import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { drizzle } from "drizzle-orm/sqlite-proxy";
import type { Db } from "./client";
import * as schema from "./schema";

type Statement = {
  run(...params: unknown[]): unknown;
  get(...params: unknown[]): unknown[] | undefined;
  all(...params: unknown[]): unknown[][];
  setReturnArrays(enabled: boolean): void;
};

type Database = {
  exec(sql: string): void;
  prepare(sql: string): Statement;
};

type SqliteModule = { DatabaseSync: new (location: string) => Database };

const MIGRATIONS = path.resolve(import.meta.dirname, "../../drizzle");

export function createTestDb(): Db {
  const require = createRequire(import.meta.url);
  const { DatabaseSync } = require("node:sqlite") as SqliteModule;
  const sqlite = new DatabaseSync(":memory:");
  for (const file of readdirSync(MIGRATIONS).sort()) {
    if (file.endsWith(".sql")) {
      sqlite.exec(readFileSync(path.join(MIGRATIONS, file), "utf8"));
    }
  }
  return drizzle(
    (sql, params, method) => {
      const statement = sqlite.prepare(sql);
      const values: unknown[] = params;
      if (method === "run") {
        statement.run(...values);
        return Promise.resolve({ rows: [] });
      }
      statement.setReturnArrays(true);
      const rows =
        method === "get"
          ? (statement.get(...values) ?? [])
          : statement.all(...values);
      return Promise.resolve({ rows });
    },
    { schema },
  );
}
