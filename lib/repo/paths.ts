import { getPathHistory, type PathHistory } from "@/lib/db/traffic";
import type { Db } from "@/lib/db/client";
import { dailyCache } from "@/lib/daily-cache";
import { getOctokitForInstallation } from "@/lib/octokit/installation";

const fetchGithubPaths = dailyCache(
  "github-paths",
  async (installationId: number, owner: string, repo: string) => {
    const octokit = await getOctokitForInstallation(installationId);
    const { data } = await octokit.rest.repos.getTopPaths({ owner, repo });
    return data.map(({ path, title, count, uniques }) => ({
      path,
      title,
      count,
      uniques,
    }));
  },
);

export async function getRepoPaths(
  installationId: number | null,
  db: Db,
  fullName: string,
  repoId: number,
  stored?: PathHistory[],
): Promise<{
  paths: Array<{
    path: string;
    title: string;
    data: Array<{ timestamp: string; count: number; uniques: number | null }>;
  }>;
}> {
  const [owner, repo] = fullName.split("/");
  const [storedData, githubRows] = await Promise.all([
    stored ?? getPathHistory(db, repoId),
    installationId === null
      ? []
      : fetchGithubPaths(installationId, owner, repo),
  ]);
  const today = new Date().toISOString().split("T")[0];
  const githubData = githubRows.map((item) => ({
    path: item.path.replace(/^\/[^/]+\/[^/]+/, "") || "/",
    title: item.title,
    count: item.count,
    uniques: item.uniques,
    date: today,
  }));

  // Group data by path
  const pathMap = new Map<
    string,
    {
      title: string;
      data: Map<string, { count: number; uniques: number | null }>;
    }
  >();

  // Add stored data
  storedData.forEach((item) => {
    if (!pathMap.has(item.path)) {
      pathMap.set(item.path, { title: item.path, data: new Map() });
    }
    pathMap.get(item.path)!.data.set(item.date, {
      count: item.total || 0,
      uniques: item.unique,
    });
  });

  // Add GitHub data (override for today's date and add title)
  githubData.forEach((item) => {
    if (!pathMap.has(item.path)) {
      pathMap.set(item.path, { title: item.title, data: new Map() });
    }
    const pathData = pathMap.get(item.path)!;
    pathData.title = item.title; // Update title from GitHub data
    pathData.data.set(item.date, {
      count: item.count,
      uniques: item.uniques,
    });
  });

  // Convert to array format and fill missing dates
  const paths = Array.from(pathMap.entries()).map(([path, pathInfo]) => {
    const sortedData = Array.from(pathInfo.data.entries()).sort((a, b) =>
      a[0].localeCompare(b[0]),
    );
    const data = [];

    if (sortedData.length > 0) {
      const startDate = new Date(sortedData[0][0]);
      const endDate = new Date();

      for (
        let d = new Date(startDate);
        d <= endDate;
        d.setDate(d.getDate() + 1)
      ) {
        const dateStr = d.toISOString().split("T")[0];
        const existingData = pathInfo.data.get(dateStr);
        data.push({
          timestamp: dateStr,
          count: existingData?.count || 0,
          uniques: existingData?.uniques ?? null,
        });
      }
    }

    return { path, title: pathInfo.title, data };
  });

  // Sort by total traffic (descending)
  paths.sort((a, b) => {
    const aTotal = a.data.reduce((sum, item) => sum + item.count, 0);
    const bTotal = b.data.reduce((sum, item) => sum + item.count, 0);
    return bTotal - aTotal;
  });

  return { paths };
}
