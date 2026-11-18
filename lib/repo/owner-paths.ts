import { cache } from "react";
import type { Repo } from "@/lib/types";
import { getRepoPaths } from "./paths";
import type { Db } from "@/lib/db/client";
import { getTopPathHistory, type PathHistory } from "@/lib/db/traffic";

const TOP_PATHS = 10;

export const getOwnerPaths = cache(
  async (
    db: Db,
    repos: Repo[],
  ): Promise<{
    paths: Array<{
      path: string;
      title: string;
      data: Array<{ timestamp: string; count: number; uniques: number | null }>;
    }>;
  }> => {
    const repoNames = new Map(
      repos.map((repo) => [repo.id, repo.full_name.split("/")[1]]),
    );
    let history: PathHistory[] = [];
    try {
      const rows = await getTopPathHistory(
        db,
        [...repoNames.keys()],
        TOP_PATHS,
      );
      history = rows.map(({ repoId, path, ...day }) => {
        const repoName = repoNames.get(repoId) ?? "";
        return { ...day, path: path === "/" ? repoName : `${repoName}${path}` };
      });
    } catch (error) {
      console.error("Error fetching paths history from D1:", error);
    }
    const { paths } = await getRepoPaths(null, db, "", 0, history);
    return { paths: paths.slice(0, TOP_PATHS) };
  },
);
