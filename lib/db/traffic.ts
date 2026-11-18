import { asc, desc, eq, gte, inArray, and, sql, sum } from "drizzle-orm";
import { sumUniques } from "@/lib/repo/sum-uniques";
import type { Db } from "./client";
import {
  clones,
  forks,
  paths,
  referrers,
  repoCounters,
  stars,
  views,
} from "./schema";

export type DailyHistory = { date: string; total: number; unique: number };
export type PathHistory = {
  date: string;
  path: string;
  total: number;
  unique: number | null;
};
export type ReferrerHistory = {
  date: string;
  referrer: string;
  total: number;
  unique: number | null;
};

export async function getDailyHistoryForRepos(
  db: Db,
  table: "views" | "clones",
  repoIds: number[],
): Promise<Map<number, DailyHistory[]>> {
  if (repoIds.length === 0) return new Map();
  const t = table === "views" ? views : clones;
  const rows = await queryChunks(repoIds, (ids) =>
    db.select().from(t).where(inArray(t.repoId, ids)).orderBy(asc(t.date)),
  );
  return groupByRepo(rows);
}

export async function getRecentViewsForRepos(
  db: Db,
  repoIds: number[],
  since: string,
): Promise<Map<number, DailyHistory[]>> {
  if (repoIds.length === 0) return new Map();
  const rows = await queryChunks(repoIds, (ids) =>
    db
      .select()
      .from(views)
      .where(and(inArray(views.repoId, ids), gte(views.date, since)))
      .orderBy(asc(views.date)),
  );
  return groupByRepo(rows);
}

export async function getDailyTotals(
  db: Db,
  table: "views" | "clones",
  repoIds: number[],
): Promise<DailyHistory[]> {
  if (repoIds.length === 0) return [];
  const t = table === "views" ? views : clones;
  const rows = await queryChunks(repoIds, (ids) =>
    db
      .select({
        date: t.date,
        total: sum(t.total).mapWith(Number),
        unique: sum(t.unique).mapWith(Number),
      })
      .from(t)
      .where(inArray(t.repoId, ids))
      .groupBy(t.date),
  );
  return mergeByDate(rows, (a, b) => ({
    date: a.date,
    total: a.total + b.total,
    unique: a.unique + b.unique,
  }));
}

export async function getDailyCountTotals(
  db: Db,
  table: "stars" | "forks",
  repoIds: number[],
): Promise<Array<{ date: string; count: number }>> {
  if (repoIds.length === 0) return [];
  const t = table === "stars" ? stars : forks;
  const rows = await queryChunks(repoIds, (ids) =>
    db
      .select({ date: t.date, count: sum(t.count).mapWith(Number) })
      .from(t)
      .where(inArray(t.repoId, ids))
      .groupBy(t.date),
  );
  return mergeByDate(rows, (a, b) => ({
    date: a.date,
    count: a.count + b.count,
  }));
}

export async function getReferrerTotals(
  db: Db,
  repoIds: number[],
): Promise<ReferrerHistory[]> {
  if (repoIds.length === 0) return [];
  const rows = await queryChunks(repoIds, (ids) =>
    db
      .select({
        date: referrers.date,
        referrer: referrers.referrer,
        total: sum(referrers.total).mapWith(Number),
        unique: sql<number | null>`sum(${referrers.unique})`,
      })
      .from(referrers)
      .where(inArray(referrers.repoId, ids))
      .groupBy(referrers.referrer, referrers.date),
  );
  return mergeRows(
    rows,
    (row) => `${row.referrer}\n${row.date}`,
    (a, b) => ({
      ...a,
      total: a.total + b.total,
      unique: sumUniques(a.unique, b.unique),
    }),
  );
}

export async function getTopPathHistory(
  db: Db,
  repoIds: number[],
  limit: number,
): Promise<Array<PathHistory & { repoId: number }>> {
  if (repoIds.length === 0) return [];
  return queryChunks(repoIds, (ids) => {
    const top = db
      .select({ repoId: paths.repoId, path: paths.path })
      .from(paths)
      .where(inArray(paths.repoId, ids))
      .groupBy(paths.repoId, paths.path)
      .orderBy(desc(sum(paths.total)))
      .limit(limit)
      .as("top");
    return db
      .select({
        repoId: paths.repoId,
        path: paths.path,
        date: paths.date,
        total: paths.total,
        unique: paths.unique,
      })
      .from(paths)
      .innerJoin(
        top,
        and(eq(paths.repoId, top.repoId), eq(paths.path, top.path)),
      )
      .orderBy(asc(paths.date), asc(paths.repoId), asc(paths.path));
  });
}

async function getPathHistoryForRepos(
  db: Db,
  repoIds: number[],
): Promise<Map<number, PathHistory[]>> {
  if (repoIds.length === 0) return new Map();
  const rows = await queryChunks(repoIds, (ids) =>
    db
      .select()
      .from(paths)
      .where(inArray(paths.repoId, ids))
      .orderBy(asc(paths.date)),
  );
  return groupByRepo(rows);
}

async function getReferrerHistoryForRepos(
  db: Db,
  repoIds: number[],
): Promise<Map<number, ReferrerHistory[]>> {
  if (repoIds.length === 0) return new Map();
  const rows = await queryChunks(repoIds, (ids) =>
    db
      .select()
      .from(referrers)
      .where(inArray(referrers.repoId, ids))
      .orderBy(asc(referrers.date)),
  );
  return groupByRepo(rows);
}

export type StarHistory = { date: string; count: number };

async function getStarHistoryForRepos(
  db: Db,
  repoIds: number[],
): Promise<Map<number, StarHistory[]>> {
  if (repoIds.length === 0) return new Map();
  const rows = await queryChunks(repoIds, (ids) =>
    db
      .select()
      .from(stars)
      .where(inArray(stars.repoId, ids))
      .orderBy(asc(stars.date)),
  );
  return groupByRepo(rows);
}

export async function getStarHistory(
  db: Db,
  repoId: number,
): Promise<StarHistory[]> {
  const byRepo = await getStarHistoryForRepos(db, [repoId]);
  return byRepo.get(repoId) ?? [];
}

export type ForkHistory = { date: string; count: number };
export type CounterHistory = {
  date: string;
  stars: number;
  forks: number;
  watchers: number;
};

export async function getForkHistoryForRepos(
  db: Db,
  repoIds: number[],
): Promise<Map<number, ForkHistory[]>> {
  if (repoIds.length === 0) return new Map();
  const rows = await queryChunks(repoIds, (ids) =>
    db
      .select()
      .from(forks)
      .where(inArray(forks.repoId, ids))
      .orderBy(asc(forks.date)),
  );
  return groupByRepo(rows);
}

export async function getCounterTotals(
  db: Db,
  repoIds: number[],
): Promise<CounterHistory[]> {
  if (repoIds.length === 0) return [];
  const rows = await queryChunks(repoIds, (ids) =>
    db
      .select({
        date: repoCounters.date,
        stars: sum(repoCounters.stars).mapWith(Number),
        forks: sum(repoCounters.forks).mapWith(Number),
        watchers: sum(repoCounters.watchers).mapWith(Number),
      })
      .from(repoCounters)
      .where(inArray(repoCounters.repoId, ids))
      .groupBy(repoCounters.date),
  );
  return mergeByDate(rows, (a, b) => ({
    date: a.date,
    stars: a.stars + b.stars,
    forks: a.forks + b.forks,
    watchers: a.watchers + b.watchers,
  }));
}

export async function getCounterHistory(
  db: Db,
  repoId: number,
): Promise<CounterHistory[]> {
  const rows = await db
    .select()
    .from(repoCounters)
    .where(eq(repoCounters.repoId, repoId))
    .orderBy(asc(repoCounters.date));
  return rows.map(({ date, stars, forks, watchers }) => ({
    date,
    stars,
    forks,
    watchers,
  }));
}

export async function getDailyHistory(
  db: Db,
  table: "views" | "clones",
  repoId: number,
): Promise<DailyHistory[]> {
  const byRepo = await getDailyHistoryForRepos(db, table, [repoId]);
  return byRepo.get(repoId) ?? [];
}

export async function getPathHistory(
  db: Db,
  repoId: number,
): Promise<PathHistory[]> {
  const byRepo = await getPathHistoryForRepos(db, [repoId]);
  return byRepo.get(repoId) ?? [];
}

export async function getReferrerHistory(
  db: Db,
  repoId: number,
): Promise<ReferrerHistory[]> {
  const byRepo = await getReferrerHistoryForRepos(db, [repoId]);
  return byRepo.get(repoId) ?? [];
}

const REPO_IDS_PER_QUERY = 90;

async function queryChunks<T extends { date: string }>(
  repoIds: number[],
  run: (ids: number[]) => Promise<T[]>,
): Promise<T[]> {
  const chunks: number[][] = [];
  for (let i = 0; i < repoIds.length; i += REPO_IDS_PER_QUERY) {
    chunks.push(repoIds.slice(i, i + REPO_IDS_PER_QUERY));
  }
  const results = await Promise.all(chunks.map(run));
  return results.flat().sort((a, b) => a.date.localeCompare(b.date));
}

function mergeRows<T>(
  rows: T[],
  key: (row: T) => string,
  add: (a: T, b: T) => T,
): T[] {
  const merged = new Map<string, T>();
  for (const row of rows) {
    const k = key(row);
    const existing = merged.get(k);
    merged.set(k, existing ? add(existing, row) : row);
  }
  return [...merged.values()];
}

function mergeByDate<T extends { date: string }>(
  rows: T[],
  add: (a: T, b: T) => T,
): T[] {
  return mergeRows(rows, (row) => row.date, add);
}

function groupByRepo<T extends { repoId: number }>(
  rows: T[],
): Map<number, Omit<T, "repoId">[]> {
  const byRepo = new Map<number, Omit<T, "repoId">[]>();
  for (const { repoId, ...rest } of rows) {
    const list = byRepo.get(repoId);
    if (list) list.push(rest);
    else byRepo.set(repoId, [rest]);
  }
  return byRepo;
}
