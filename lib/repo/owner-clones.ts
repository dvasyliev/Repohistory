import { cache } from "react";
import type { Repo } from "@/lib/types";
import { getRepoClones } from "./clones";
import type { Db } from "@/lib/db/client";
import { getDailyTotals } from "@/lib/db/traffic";

export const getOwnerClones = cache(
  async (
    db: Db,
    repos: Repo[],
  ): Promise<{
    count: number;
    uniques: number;
    clones: Array<{ timestamp: string; count: number; uniques: number }>;
  }> => {
    const totals = await getDailyTotals(
      db,
      "clones",
      repos.map((repo) => repo.id),
    );
    return getRepoClones(null, db, "", 0, totals);
  },
);
