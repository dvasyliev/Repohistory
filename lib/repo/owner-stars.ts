import { cache } from "react";
import type { Db } from "@/lib/db/client";
import { getDailyCountTotals } from "@/lib/db/traffic";
import type { Repo } from "@/lib/types";
import { toDailyCounts } from "./cumulative";
import type { RepoStarsData } from "./stars";

export const getOwnerStars = cache(
  async (db: Db, repos: Repo[]): Promise<RepoStarsData> => {
    const totalStars = repos.reduce(
      (sum, repo) => sum + repo.stargazers_count,
      0,
    );
    const totals = await getDailyCountTotals(
      db,
      "stars",
      repos.map((repo) => repo.id),
    );
    return {
      totalStars,
      starsHistory: toDailyCounts(totals),
    };
  },
);
