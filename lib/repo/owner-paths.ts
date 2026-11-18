import type { Repo } from "@/lib/types";
import { getRepoPaths } from "./paths";
import { sumUniques } from "./sum-uniques";
import type { Db } from "@/lib/db/client";
import { getPathHistoryForRepos } from "@/lib/db/traffic";

export async function getOwnerPaths(
  db: Db,
  repos: Repo[],
): Promise<{
  paths: Array<{
    path: string;
    title: string;
    data: Array<{ timestamp: string; count: number; uniques: number | null }>;
  }>;
}> {
  let history: Awaited<ReturnType<typeof getPathHistoryForRepos>> = new Map();
  try {
    history = await getPathHistoryForRepos(
      db,
      repos.map((repo) => repo.id),
    );
  } catch (error) {
    console.error("Error fetching paths history from D1:", error);
  }
  const repoPathsPromises = repos.map((repo) =>
    getRepoPaths(null, db, repo.full_name, repo.id, history.get(repo.id) ?? []),
  );

  const allRepoPaths = await Promise.all(repoPathsPromises);

  const aggregatedPaths = aggregatePathsHistory(allRepoPaths, repos);

  return {
    paths: aggregatedPaths,
  };
}

function aggregatePathsHistory(
  allRepoPaths: Array<{
    paths: Array<{
      path: string;
      title: string;
      data: Array<{ timestamp: string; count: number; uniques: number | null }>;
    }>;
  }>,
  repos: Repo[],
): Array<{
  path: string;
  title: string;
  data: Array<{ timestamp: string; count: number; uniques: number | null }>;
}> {
  const pathMap = new Map<
    string,
    {
      title: string;
      repoCount: Set<string>;
      data: Map<string, { count: number; uniques: number | null }>;
    }
  >();

  // Aggregate data from all repos
  allRepoPaths.forEach((repoPaths, repoIndex) => {
    const repoName = repos[repoIndex].full_name;

    repoPaths.paths.forEach(({ path, data }) => {
      // Create a composite key that includes repo info for better aggregation
      const repoNameOnly = repoName.split("/")[1]; // Get just the repo name without owner
      const displayPath =
        path === "/" ? repoNameOnly : `${repoNameOnly}${path}`;

      if (!pathMap.has(displayPath)) {
        pathMap.set(displayPath, {
          title: displayPath,
          repoCount: new Set(),
          data: new Map(),
        });
      }

      const pathInfo = pathMap.get(displayPath)!;
      pathInfo.repoCount.add(repoName);

      data.forEach(({ timestamp, count, uniques }) => {
        const existing = pathInfo.data.get(timestamp);
        if (existing) {
          pathInfo.data.set(timestamp, {
            count: existing.count + count,
            uniques: sumUniques(existing.uniques, uniques),
          });
        } else {
          pathInfo.data.set(timestamp, { count, uniques });
        }
      });
    });
  });

  // Convert back to array format
  const paths = Array.from(pathMap.entries()).map(([displayPath, pathInfo]) => {
    const sortedEntries = Array.from(pathInfo.data.entries()).sort((a, b) =>
      a[0].localeCompare(b[0]),
    );

    const data = sortedEntries.map(([timestamp, { count, uniques }]) => ({
      timestamp,
      count,
      uniques,
    }));

    return {
      path: displayPath,
      title: pathInfo.title,
      data,
    };
  });

  // Sort by total traffic (descending) and take top 10
  paths.sort((a, b) => {
    const aTotal = a.data.reduce((sum, item) => sum + item.count, 0);
    const bTotal = b.data.reduce((sum, item) => sum + item.count, 0);
    return bTotal - aTotal;
  });

  return paths.slice(0, 10);
}
