import { sql } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { clones, paths, referrers, views } from "@/lib/db/schema";

export type DailyRow = typeof views.$inferInsert;
export type PathRow = typeof paths.$inferInsert;
export type ReferrerRow = typeof referrers.$inferInsert;

type Counts = { count: number; uniques: number };

export function toDailyRows(
  repoId: number,
  items: (Counts & { timestamp: string })[],
): DailyRow[] {
  return items.map((item) => ({
    repoId,
    date: item.timestamp.slice(0, 10),
    total: item.count,
    unique: item.uniques,
  }));
}

export function toPathRows(
  repoId: number,
  items: (Counts & { path: string })[],
  date: string,
): PathRow[] {
  const byPath = new Map<string, PathRow>();
  for (const item of items) {
    const path = item.path.replace(/^\/[^/]+\/[^/]+/, "") || "/";
    const existing = byPath.get(path);
    if (existing) {
      existing.total += item.count;
      existing.unique = (existing.unique ?? 0) + item.uniques;
    } else {
      byPath.set(path, {
        repoId,
        path,
        date,
        total: item.count,
        unique: item.uniques,
      });
    }
  }
  return Array.from(byPath.values());
}

export function toReferrerRows(
  repoId: number,
  items: (Counts & { referrer: string })[],
  date: string,
): ReferrerRow[] {
  return items.map((item) => ({
    repoId,
    referrer: item.referrer,
    date,
    total: item.count,
    unique: item.uniques,
  }));
}

export async function upsertTraffic(
  db: Db,
  rows: {
    views: DailyRow[];
    clones: DailyRow[];
    paths: PathRow[];
    referrers: ReferrerRow[];
  },
): Promise<void> {
  const set = { total: sql`excluded.total`, unique: sql`excluded."unique"` };
  const statements = [];
  if (rows.views.length > 0) {
    statements.push(
      db
        .insert(views)
        .values(rows.views)
        .onConflictDoUpdate({ target: [views.repoId, views.date], set }),
    );
  }
  if (rows.clones.length > 0) {
    statements.push(
      db
        .insert(clones)
        .values(rows.clones)
        .onConflictDoUpdate({ target: [clones.repoId, clones.date], set }),
    );
  }
  if (rows.paths.length > 0) {
    statements.push(
      db
        .insert(paths)
        .values(rows.paths)
        .onConflictDoUpdate({
          target: [paths.repoId, paths.path, paths.date],
          set,
        }),
    );
  }
  if (rows.referrers.length > 0) {
    statements.push(
      db
        .insert(referrers)
        .values(rows.referrers)
        .onConflictDoUpdate({
          target: [referrers.repoId, referrers.referrer, referrers.date],
          set,
        }),
    );
  }
  if (statements.length === 0) return;
  const [first, ...rest] = statements;
  await db.batch([first, ...rest]);
}
