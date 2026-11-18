import { cache } from "react";
import type { Db } from "@/lib/db/client";
import { getDailyCountTotals } from "@/lib/db/traffic";
import type { Repo } from "@/lib/types";
import { toCumulativeDays, type RepoStarsData } from "./stars";

export const getOwnerStars = cache(
  async (db: Db, repos: Repo[]): Promise<RepoStarsData> => {
    const totalStars = repos.reduce(
      (sum, repo) => sum + repo.stargazers_count,
      0,
    );
    try {
      const totals = await getDailyCountTotals(
        db,
        "stars",
        repos.map((repo) => repo.id),
      );
      return {
        totalStars,
        hasEstimatedData: false,
        starsHistory: toCumulativeDays(
          Object.fromEntries(totals.map(({ date, count }) => [date, count])),
        ),
      };
    } catch (error) {
      console.error("Error fetching stars history from D1:", error);
      return { totalStars, hasEstimatedData: false, starsHistory: [] };
    }
  },
);
