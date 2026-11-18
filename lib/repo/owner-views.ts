import { cache } from "react";
import type { Repo } from "@/lib/types";
import { getRepoViews } from "./views";
import type { Db } from "@/lib/db/client";
import { getDailyTotals, type DailyHistory } from "@/lib/db/traffic";

export const getOwnerViews = cache(
  async (
    db: Db,
    repos: Repo[],
  ): Promise<{
    count: number;
    uniques: number;
    views: Array<{ timestamp: string; count: number; uniques: number }>;
  }> => {
    let totals: DailyHistory[] = [];
    try {
      totals = await getDailyTotals(
        db,
        "views",
        repos.map((repo) => repo.id),
      );
    } catch (error) {
      console.error("Error fetching views history from D1:", error);
    }
    return getRepoViews(null, db, "", 0, totals);
  },
);
