import { getDailyHistory, type DailyHistory } from "@/lib/db/traffic";
import type { Db } from "@/lib/db/client";
import { dailyCache } from "@/lib/daily-cache";
import { getOctokitForInstallation } from "@/lib/octokit/installation";

const fetchGithubViews = dailyCache(
  "github-views",
  async (installationId: number, owner: string, repo: string) => {
    const octokit = await getOctokitForInstallation(installationId);
    const { data } = await octokit.rest.repos.getViews({ owner, repo });
    return data.views.map((item) => ({
      date: item.timestamp.split("T")[0],
      count: item.count,
      uniques: item.uniques,
    }));
  },
);

export async function getRepoViews(
  installationId: number | null,
  db: Db,
  fullName: string,
  repoId: number,
  stored?: DailyHistory[],
): Promise<{
  count: number;
  uniques: number;
  views: Array<{ timestamp: string; count: number; uniques: number }>;
}> {
  const [owner, repo] = fullName.split("/");
  const [storedData, githubData] = await Promise.all([
    stored ?? getDailyHistory(db, "views", repoId),
    installationId === null
      ? []
      : fetchGithubViews(installationId, owner, repo),
  ]);

  // Merge data: GitHub overrides stored for matching dates
  const dataMap = new Map(
    storedData.map((item) => [
      item.date,
      {
        timestamp: item.date,
        count: item.total || 0,
        uniques: item.unique || 0,
      },
    ]),
  );

  // Override with GitHub data (more precise for recent dates)
  githubData.forEach((item) => {
    dataMap.set(item.date, {
      timestamp: item.date,
      count: item.count,
      uniques: item.uniques,
    });
  });

  // Fill missing dates with 0 values
  const sortedViews = Array.from(dataMap.values()).sort((a, b) =>
    a.timestamp.localeCompare(b.timestamp),
  );
  const views = [];

  if (sortedViews.length > 0) {
    const startDate = new Date(sortedViews[0].timestamp);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - 1);

    for (
      let d = new Date(startDate);
      d <= endDate;
      d.setDate(d.getDate() + 1)
    ) {
      const dateStr = d.toISOString().split("T")[0];
      const existingData = dataMap.get(dateStr);
      views.push(existingData || { timestamp: dateStr, count: 0, uniques: 0 });
    }
  }

  const count = views.reduce((sum, item) => sum + item.count, 0);
  const uniques = views.reduce((sum, item) => sum + item.uniques, 0);

  return { count, uniques, views };
}
