import type { Octokit } from "octokit";
import type { Repo } from "@/lib/types";
import { getRepoViews } from "./views";
import type { Db } from "@/lib/db/client";
import { getDailyHistoryForRepos } from "@/lib/db/traffic";

export async function getOwnerViews(
  octokit: Octokit,
  db: Db,
  repos: Repo[],
): Promise<{
  count: number;
  uniques: number;
  views: Array<{ timestamp: string; count: number; uniques: number }>;
}> {
  let history: Awaited<ReturnType<typeof getDailyHistoryForRepos>> = new Map();
  try {
    history = await getDailyHistoryForRepos(
      db,
      "views",
      repos.map((repo) => repo.id),
    );
  } catch (error) {
    console.error("Error fetching views history from D1:", error);
  }
  const repoViewsPromises = repos.map((repo) =>
    getRepoViews(
      octokit,
      db,
      repo.full_name,
      repo.id,
      history.get(repo.id) ?? [],
    ),
  );

  const allRepoViews = await Promise.all(repoViewsPromises);

  const totalCount = allRepoViews.reduce(
    (sum, repoViews) => sum + repoViews.count,
    0,
  );
  const totalUniques = allRepoViews.reduce(
    (sum, repoViews) => sum + repoViews.uniques,
    0,
  );

  const aggregatedViews = aggregateViewsHistory(allRepoViews);

  return {
    count: totalCount,
    uniques: totalUniques,
    views: aggregatedViews,
  };
}

function aggregateViewsHistory(
  allRepoViews: Array<{
    count: number;
    uniques: number;
    views: Array<{ timestamp: string; count: number; uniques: number }>;
  }>,
): Array<{ timestamp: string; count: number; uniques: number }> {
  const dateMap = new Map<string, { count: number; uniques: number }>();

  allRepoViews.forEach((repoViews) => {
    repoViews.views.forEach(({ timestamp, count, uniques }) => {
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
