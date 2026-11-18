import { cache } from "react";
import type { Repo } from "@/lib/types";
import { getRepoReferrers } from "./referrers";
import type { Db } from "@/lib/db/client";
import { getReferrerTotals } from "@/lib/db/traffic";

const TOP_REFERRERS = 10;

export const getOwnerReferrers = cache(
  async (
    db: Db,
    repos: Repo[],
  ): Promise<{
    referrers: Array<{
      referrer: string;
      data: Array<{ timestamp: string; count: number; uniques: number | null }>;
    }>;
  }> => {
    const totals = await getReferrerTotals(
      db,
      repos.map((repo) => repo.id),
    );
    const { referrers } = await getRepoReferrers(null, db, "", 0, totals);
    return { referrers: referrers.slice(0, TOP_REFERRERS) };
  },
);
