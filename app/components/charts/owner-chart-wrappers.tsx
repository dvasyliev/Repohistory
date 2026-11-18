import { ReferrersChart } from "./referrers-chart";
import { PopularContentChart } from "./popular-content-chart";
import { getOwnerReferrers } from "@/lib/repo/owner-referrers";
import { getOwnerPaths } from "@/lib/repo/owner-paths";
import type { Db } from "@/lib/db/client";
import type { Repo } from "@/lib/types";

interface OwnerReferrersChartWrapperProps {
  repos: Repo[];
  db: Db;
}

export async function OwnerReferrersChartWrapper({
  repos,
  db,
}: OwnerReferrersChartWrapperProps) {
  const { referrers } = await getOwnerReferrers(db, repos);
  return <ReferrersChart traffic={{ referrers }} />;
}

interface OwnerPopularContentChartWrapperProps {
  repos: Repo[];
  db: Db;
}

export async function OwnerPopularContentChartWrapper({
  repos,
  db,
}: OwnerPopularContentChartWrapperProps) {
  const { paths } = await getOwnerPaths(db, repos);
  return <PopularContentChart traffic={{ paths }} />;
}
