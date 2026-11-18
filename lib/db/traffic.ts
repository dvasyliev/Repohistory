import { asc, gte, inArray, and, sum } from "drizzle-orm";
import type { Db } from "./client";
import { clones, paths, referrers, stars, views } from "./schema";

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

export async function getRecentViewTotals(
  db: Db,
  repoIds: number[],
  since: string,
): Promise<Map<number, number>> {
  const totals = new Map<number, number>();
  const chunks: number[][] = [];
  for (let i = 0; i < repoIds.length; i += REPO_IDS_PER_QUERY) {
    chunks.push(repoIds.slice(i, i + REPO_IDS_PER_QUERY));
  }
  const results = await Promise.all(
    chunks.map((ids) =>
      db
        .select({ repoId: views.repoId, total: sum(views.total) })
        .from(views)
        .where(and(inArray(views.repoId, ids), gte(views.date, since)))
        .groupBy(views.repoId),
    ),
  );
  for (const rows of results) {
    for (const { repoId, total } of rows) totals.set(repoId, Number(total));
  }
  return totals;
}

export async function getPathHistoryForRepos(
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

export async function getReferrerHistoryForRepos(
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

export async function getStarHistoryForRepos(
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
