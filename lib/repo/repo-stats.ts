import { cache } from "react";
import type { Db } from "@/lib/db/client";
import {
  getCounterHistory,
  getCounterTotals,
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
import { sumCommitHistories } from "./commit-series";

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

export const getOwnerCounters = cache(
  (db: Db, repos: Repo[]): Promise<CounterHistory[]> =>
    getCounterTotals(
      db,
      repos.map((repo) => repo.id),
    ),
);

class StillCountingError extends Error {}

async function fetchCommits(
  installationId: number,
  owner: string,
  repo: string,
): Promise<CommitHistory> {
  const octokit = await getOctokitForInstallation(installationId);
  const history = await fetchCommitHistory(octokit, owner, repo);
  if (history === null) throw new StillCountingError();
  return history;
}

const fetchCachedCommits = dailyCache("github-commits", fetchCommits);

// One cache entry per owner: a cache call counts toward the 50 subrequests a page may make.
const fetchCachedOwnerCommits = dailyCache(
  "github-owner-commits",
  async (installationId: number, owner: string, repoNames: string) =>
    sumCommitHistories(
      await Promise.all(
        repoNames
          .split(",")
          .map((repo) => fetchCommits(installationId, owner, repo)),
      ),
    ),
);

async function nullWhileCounting(
  read: Promise<CommitHistory>,
): Promise<CommitHistory | null> {
  try {
    return await read;
  } catch (error) {
    if (error instanceof StillCountingError) return null;
    throw error;
  }
}

export function getRepoCommits(
  installationId: number,
  owner: string,
  repo: string,
): Promise<CommitHistory | null> {
  return nullWhileCounting(fetchCachedCommits(installationId, owner, repo));
}

export function getOwnerCommits(
  installationId: number,
  owner: string,
  repos: Repo[],
): Promise<CommitHistory | null> {
  const repoNames = repos
    .map((repo) => repo.name)
    .sort()
    .join(",");
  return nullWhileCounting(
    fetchCachedOwnerCommits(installationId, owner, repoNames),
  );
}
