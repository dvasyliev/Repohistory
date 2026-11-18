import { cache } from "react";
import type { Repo } from "@/lib/types";
import { getRepoClones } from "./clones";
import type { Db } from "@/lib/db/client";
import { getDailyTotals, type DailyHistory } from "@/lib/db/traffic";

export const getOwnerClones = cache(
  async (
    db: Db,
    repos: Repo[],
  ): Promise<{
    count: number;
    uniques: number;
    clones: Array<{ timestamp: string; count: number; uniques: number }>;
  }> => {
    let totals: DailyHistory[] = [];
    try {
      totals = await getDailyTotals(
        db,
        "clones",
        repos.map((repo) => repo.id),
      );
    } catch (error) {
      console.error("Error fetching clones history from D1:", error);
    }
    return getRepoClones(null, db, "", 0, totals);
  },
);
