import type { Db } from "@/lib/db/client";
import { getStarHistoryForRepos } from "@/lib/db/traffic";
import type { Repo } from "@/lib/types";
import type { RepoStarsData } from "./stars";
import { getRepoStars } from "./stars";

export async function getOwnerStars(
  db: Db,
  repos: Repo[],
): Promise<RepoStarsData> {
  let history: Awaited<ReturnType<typeof getStarHistoryForRepos>> = new Map();
  try {
    history = await getStarHistoryForRepos(
      db,
      repos.map((repo) => repo.id),
    );
  } catch (error) {
    console.error("Error fetching stars history from D1:", error);
  }
  const repoStarsPromises = repos.map((repo) =>
    getRepoStars(
      db,
      {
        id: repo.id,
        fullName: repo.full_name,
        stargazersCount: repo.stargazers_count,
      },
      history.get(repo.id) ?? [],
    ),
  );

  const allRepoStars = await Promise.all(repoStarsPromises);

  const totalStars = allRepoStars.reduce(
    (sum, repoStars) => sum + repoStars.totalStars,
    0,
  );
  const hasEstimatedData = allRepoStars.some(
    (repoStars) => repoStars.hasEstimatedData,
  );

  const aggregatedHistory = aggregateStarsHistory(allRepoStars);

  return {
    totalStars,
    hasEstimatedData,
    starsHistory: aggregatedHistory,
  };
}

function aggregateStarsHistory(allRepoStars: RepoStarsData[]): Array<{
  date: string;
  cumulative: number;
  daily: number;
  isEstimated?: boolean;
}> {
  const dateMap = new Map<
    string,
    { cumulative: number; daily: number; isEstimated?: boolean }
  >();

  allRepoStars.forEach((repoStars) => {
    repoStars.starsHistory.forEach(
      ({ date, cumulative, daily, isEstimated }) => {
        const existing = dateMap.get(date);
        if (existing) {
          dateMap.set(date, {
            cumulative: existing.cumulative + cumulative,
            daily: existing.daily + daily,
            isEstimated: existing.isEstimated || isEstimated,
          });
        } else {
          dateMap.set(date, { cumulative, daily, isEstimated });
        }
      },
    );
  });

  const sortedEntries = Array.from(dateMap.entries()).sort(
    (a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime(),
  );

  let runningCumulative = 0;
  return sortedEntries.map(([date, { daily, isEstimated }]) => {
    runningCumulative += daily;
    return {
      date,
      daily,
      cumulative: runningCumulative,
      isEstimated,
    };
  });
}
