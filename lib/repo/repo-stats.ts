import { cache } from "react";
import type { Db } from "@/lib/db/client";
import {
  getCounterHistory,
  getDailyCountTotals,
  getForkHistoryForRepos,
  type CounterHistory,
} from "@/lib/db/traffic";
import {
  fetchCommitHistory,
  type CommitHistory,
} from "@/lib/repo/github-stats";
import type { Repo } from "@/lib/types";
import { dailyCache } from "@/lib/daily-cache";
import { getOctokitForInstallation } from "@/lib/octokit/installation";
import { toDailyCounts, type DailyCount } from "./cumulative";

export async function getRepoForks(
  db: Db,
  repoId: number,
): Promise<DailyCount[]> {
  const byRepo = await getForkHistoryForRepos(db, [repoId]);
  return toDailyCounts(byRepo.get(repoId) ?? []);
}

export const getOwnerForks = cache(
  async (db: Db, repos: Repo[]): Promise<DailyCount[]> => {
    const totals = await getDailyCountTotals(
      db,
      "forks",
      repos.map((repo) => repo.id),
    );
    return toDailyCounts(totals);
  },
);

export function getRepoCounters(
  db: Db,
  repoId: number,
): Promise<CounterHistory[]> {
  return getCounterHistory(db, repoId);
}

class StillCountingError extends Error {}

const fetchCachedCommits = dailyCache(
  "github-commits",
  async (installationId: number, owner: string, repo: string) => {
    const octokit = await getOctokitForInstallation(installationId);
    const history = await fetchCommitHistory(octokit, owner, repo);
    if (history === null) throw new StillCountingError();
    return history;
  },
);

export async function getRepoCommits(
  installationId: number,
  owner: string,
  repo: string,
): Promise<CommitHistory | null> {
  try {
    return await fetchCachedCommits(installationId, owner, repo);
  } catch (error) {
    if (error instanceof StillCountingError) return null;
    throw error;
  }
}
