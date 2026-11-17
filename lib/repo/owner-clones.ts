import type { Octokit } from "octokit";
import type { Repo } from "@/lib/types";
import { getRepoClones } from "./clones";
import type { Db } from "@/lib/db/client";
import { getDailyHistoryForRepos } from "@/lib/db/traffic";

export async function getOwnerClones(
  octokit: Octokit,
  db: Db,
  repos: Repo[],
): Promise<{
  count: number;
  uniques: number;
  clones: Array<{ timestamp: string; count: number; uniques: number }>;
}> {
  let history: Awaited<ReturnType<typeof getDailyHistoryForRepos>> = new Map();
  try {
    history = await getDailyHistoryForRepos(
      db,
      "clones",
      repos.map((repo) => repo.id),
    );
  } catch (error) {
    console.error("Error fetching clones history from D1:", error);
  }
  const repoClonesPromises = repos.map((repo) =>
    getRepoClones(
      octokit,
      db,
      repo.full_name,
      repo.id,
      history.get(repo.id) ?? [],
    ),
  );

  const allRepoClones = await Promise.all(repoClonesPromises);

  const totalCount = allRepoClones.reduce(
    (sum, repoClones) => sum + repoClones.count,
    0,
  );
  const totalUniques = allRepoClones.reduce(
    (sum, repoClones) => sum + repoClones.uniques,
    0,
  );

  const aggregatedClones = aggregateClonesHistory(allRepoClones);

  return {
    count: totalCount,
    uniques: totalUniques,
    clones: aggregatedClones,
  };
}

function aggregateClonesHistory(
  allRepoClones: Array<{
    count: number;
    uniques: number;
    clones: Array<{ timestamp: string; count: number; uniques: number }>;
  }>,
): Array<{ timestamp: string; count: number; uniques: number }> {
  const dateMap = new Map<string, { count: number; uniques: number }>();

  allRepoClones.forEach((repoClones) => {
    repoClones.clones.forEach(({ timestamp, count, uniques }) => {
      const existing = dateMap.get(timestamp);
      if (existing) {
        dateMap.set(timestamp, {
          count: existing.count + count,
          uniques: existing.uniques + uniques,
        });
      } else {
        dateMap.set(timestamp, { count, uniques });
      }
    });
  });

  const sortedEntries = Array.from(dateMap.entries()).sort((a, b) =>
    a[0].localeCompare(b[0]),
  );

  return sortedEntries.map(([timestamp, { count, uniques }]) => ({
    timestamp,
    count,
    uniques,
  }));
}
