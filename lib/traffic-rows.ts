import { eq, sql } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import {
  clones,
  commitWeeks,
  forks,
  paths,
  referrers,
  repoCounters,
  stars,
  views,
} from "@/lib/db/schema";
import { toDailyStars, type StarWeek } from "@/lib/repo/stars";

export type DailyRow = typeof views.$inferInsert;
export type PathRow = typeof paths.$inferInsert;
export type ReferrerRow = typeof referrers.$inferInsert;

export type StarRow = typeof stars.$inferInsert;
export type CounterRow = typeof repoCounters.$inferInsert;
export type ForkRow = typeof forks.$inferInsert;
export type CommitWeekRow = typeof commitWeeks.$inferInsert;

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

export function toStarRows(repoId: number, weeks: StarWeek[]): StarRow[] {
  return Object.entries(toDailyStars(weeks)).map(([date, count]) => ({
    repoId,
    date,
    count,
  }));
}

export function toForkRows(repoId: number, createdAt: string[]): ForkRow[] {
  const counts = new Map<string, number>();
  for (const timestamp of createdAt) {
    const date = timestamp.slice(0, 10);
    counts.set(date, (counts.get(date) ?? 0) + 1);
  }
  return Array.from(counts, ([date, count]) => ({ repoId, date, count }));
}

const weekDate = (week: number) =>
  new Date(week * 1000).toISOString().slice(0, 10);

export function toCommitActivityRows(
  repoId: number,
  activity: { week: number; total: number }[],
): CommitWeekRow[] {
  return activity.map(({ week, total }) => ({
    repoId,
    week: weekDate(week),
    commits: total,
    additions: 0,
    deletions: 0,
  }));
}

export function toCodeFrequencyRows(
  repoId: number,
  frequency: [number, number, number][],
): CommitWeekRow[] {
  return frequency.map(([week, additions, deletions]) => ({
    repoId,
    week: weekDate(week),
    commits: 0,
    additions,
    deletions: Math.abs(deletions),
  }));
}

const ROWS_PER_STATEMENT = 20;
const COUNTER_ROWS_PER_STATEMENT = 16;
const ROWS_PER_BATCH = 500;
const STATEMENTS_PER_BATCH = ROWS_PER_BATCH / ROWS_PER_STATEMENT;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export async function upsertTraffic(
  db: Db,
  rows: {
    views: DailyRow[];
    clones: DailyRow[];
    paths: PathRow[];
    referrers: ReferrerRow[];
    stars?: { repoId: number; rows: StarRow[] };
    counters?: CounterRow[];
    forks?: { repoId: number; rows: ForkRow[] };
    commitWeeks?: { activity: CommitWeekRow[]; frequency: CommitWeekRow[] };
  },
): Promise<void> {
  const set = { total: sql`excluded.total`, unique: sql`excluded."unique"` };
  const statements = [
    ...(rows.stars
      ? [db.delete(stars).where(eq(stars.repoId, rows.stars.repoId))]
      : []),
    ...(rows.forks
      ? [db.delete(forks).where(eq(forks.repoId, rows.forks.repoId))]
      : []),
    ...chunk(rows.views, ROWS_PER_STATEMENT).map((values) =>
      db
        .insert(views)
        .values(values)
        .onConflictDoUpdate({ target: [views.repoId, views.date], set }),
    ),
    ...chunk(rows.clones, ROWS_PER_STATEMENT).map((values) =>
      db
        .insert(clones)
        .values(values)
        .onConflictDoUpdate({ target: [clones.repoId, clones.date], set }),
    ),
    ...chunk(rows.paths, ROWS_PER_STATEMENT).map((values) =>
      db
        .insert(paths)
        .values(values)
        .onConflictDoUpdate({
          target: [paths.repoId, paths.path, paths.date],
          set,
        }),
    ),
    ...chunk(rows.referrers, ROWS_PER_STATEMENT).map((values) =>
      db
        .insert(referrers)
        .values(values)
        .onConflictDoUpdate({
          target: [referrers.repoId, referrers.referrer, referrers.date],
          set,
        }),
    ),
    ...chunk(rows.stars?.rows ?? [], ROWS_PER_STATEMENT).map((values) =>
      db
        .insert(stars)
        .values(values)
        .onConflictDoUpdate({
          target: [stars.repoId, stars.date],
          set: { count: sql`excluded.count` },
        }),
    ),
    ...chunk(rows.forks?.rows ?? [], ROWS_PER_STATEMENT).map((values) =>
      db
        .insert(forks)
        .values(values)
        .onConflictDoUpdate({
          target: [forks.repoId, forks.date],
          set: { count: sql`excluded.count` },
        }),
    ),
    ...chunk(rows.commitWeeks?.activity ?? [], ROWS_PER_STATEMENT).map(
      (values) =>
        db
          .insert(commitWeeks)
          .values(values)
          .onConflictDoUpdate({
            target: [commitWeeks.repoId, commitWeeks.week],
            set: { commits: sql`excluded.commits` },
          }),
    ),
    ...chunk(rows.commitWeeks?.frequency ?? [], ROWS_PER_STATEMENT).map(
      (values) =>
        db
          .insert(commitWeeks)
          .values(values)
          .onConflictDoUpdate({
            target: [commitWeeks.repoId, commitWeeks.week],
            set: {
              additions: sql`excluded.additions`,
              deletions: sql`excluded.deletions`,
            },
          }),
    ),
    ...chunk(rows.counters ?? [], COUNTER_ROWS_PER_STATEMENT).map((values) =>
      db
        .insert(repoCounters)
        .values(values)
        .onConflictDoUpdate({
          target: [repoCounters.repoId, repoCounters.date],
          set: {
            stars: sql`excluded.stars`,
            forks: sql`excluded.forks`,
            watchers: sql`excluded.watchers`,
            openIssues: sql`excluded.open_issues`,
          },
        }),
    ),
  ];
  for (const group of chunk(statements, STATEMENTS_PER_BATCH)) {
    const [first, ...rest] = group;
    await db.batch([first, ...rest]);
  }
}
