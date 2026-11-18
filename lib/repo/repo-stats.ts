import type { Db } from "@/lib/db/client";
import {
  getCommitWeeks,
  getCounterHistory,
  getForkHistoryForRepos,
  type CommitWeek,
  type CounterHistory,
} from "@/lib/db/traffic";
import type { Repo } from "@/lib/types";
import { toCumulativeDays } from "./stars";

export type ForkDay = { date: string; daily: number; cumulative: number };

function toForkDays(daily: Record<string, number>): ForkDay[] {
  return toCumulativeDays(daily).map(({ date, daily, cumulative }) => ({
    date,
    daily,
    cumulative,
  }));
}

export async function getRepoForks(db: Db, repoId: number): Promise<ForkDay[]> {
  try {
    const byRepo = await getForkHistoryForRepos(db, [repoId]);
    const rows = byRepo.get(repoId) ?? [];
    return toForkDays(Object.fromEntries(rows.map((r) => [r.date, r.count])));
  } catch (error) {
    console.error("Error fetching forks from D1:", error);
    return [];
  }
}

export async function getOwnerForks(db: Db, repos: Repo[]): Promise<ForkDay[]> {
  try {
    const byRepo = await getForkHistoryForRepos(
      db,
      repos.map((repo) => repo.id),
    );
    const daily: Record<string, number> = {};
    for (const rows of byRepo.values()) {
      for (const { date, count } of rows) {
        daily[date] = (daily[date] ?? 0) + count;
      }
    }
    return toForkDays(daily);
  } catch (error) {
    console.error("Error fetching forks from D1:", error);
    return [];
  }
}

export async function getRepoCounters(
  db: Db,
  repoId: number,
): Promise<CounterHistory[]> {
  try {
    return await getCounterHistory(db, repoId);
  } catch (error) {
    console.error("Error fetching counters from D1:", error);
    return [];
  }
}

export async function getRepoCommitWeeks(
  db: Db,
  repoId: number,
): Promise<CommitWeek[]> {
  try {
    return await getCommitWeeks(db, repoId);
  } catch (error) {
    console.error("Error fetching commit activity from D1:", error);
    return [];
  }
}
