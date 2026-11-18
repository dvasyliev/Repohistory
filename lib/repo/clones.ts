import type { Octokit } from "octokit";
import { getDailyHistory, type DailyHistory } from "@/lib/db/traffic";
import type { Db } from "@/lib/db/client";

export async function getRepoClones(
  octokit: Octokit | null,
  db: Db,
  fullName: string,
  repoId: number,
  stored?: DailyHistory[],
): Promise<{
  count: number;
  uniques: number;
  clones: Array<{ timestamp: string; count: number; uniques: number }>;
}> {
  try {
    const [owner, repo] = fullName.split("/");

    // Fetch data from both sources in parallel
    const [storedResult, githubResult] = await Promise.allSettled([
      stored ?? getDailyHistory(db, "clones", repoId),
      octokit?.rest.repos.getClones({ owner, repo }) ?? null,
    ]);

    // Process stored data
    const storedData =
      (storedResult.status === "fulfilled" && storedResult.value) || [];
    if (storedResult.status === "rejected") {
      console.error("Error fetching clones from D1:", storedResult.reason);
    }

    // Process GitHub data
    const githubData =
      githubResult.status === "fulfilled" && githubResult.value
        ? githubResult.value.data.clones?.map((item) => ({
            date: item.timestamp.split("T")[0],
            count: item.count,
            uniques: item.uniques,
          })) || []
        : [];

    if (githubResult.status === "rejected") {
      console.error(
        "Error fetching clones from GitHub API:",
        githubResult.reason,
      );
    }

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
    const sortedClones = Array.from(dataMap.values()).sort((a, b) =>
      a.timestamp.localeCompare(b.timestamp),
    );
    const clones = [];

    if (sortedClones.length > 0) {
      const startDate = new Date(sortedClones[0].timestamp);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - 1);

      for (
        let d = new Date(startDate);
        d <= endDate;
        d.setDate(d.getDate() + 1)
      ) {
        const dateStr = d.toISOString().split("T")[0];
        const existingData = dataMap.get(dateStr);
        clones.push(
          existingData || { timestamp: dateStr, count: 0, uniques: 0 },
        );
      }
    }

    const count = clones.reduce((sum, item) => sum + item.count, 0);
    const uniques = clones.reduce((sum, item) => sum + item.uniques, 0);

    return { count, uniques, clones };
  } catch (error) {
    console.error("Error fetching clones data:", error);
    return { count: 0, uniques: 0, clones: [] };
  }
}
