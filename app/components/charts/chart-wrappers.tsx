import { ReferrersChart } from "./referrers-chart";
import { PopularContentChart } from "./popular-content-chart";
import { getRepoReferrers } from "@/lib/repo/referrers";
import { getRepoPaths } from "@/lib/repo/paths";
import { getInstallationId } from "@/lib/octokit/installation";
import type { Db } from "@/lib/db/client";

interface TrafficChartWrapperProps {
  fullName: string;
  repoId: number;
  db: Db;
}

export async function ReferrersChartWrapper({
  fullName,
  repoId,
  db,
}: TrafficChartWrapperProps) {
  const installationId = await getInstallationId(fullName.split("/")[0]);
  const { referrers } = await getRepoReferrers(
    installationId,
    db,
    fullName,
    repoId,
  );
  return <ReferrersChart traffic={{ referrers }} />;
}

export async function PopularContentChartWrapper({
  fullName,
  repoId,
  db,
}: TrafficChartWrapperProps) {
  const installationId = await getInstallationId(fullName.split("/")[0]);
  const { paths } = await getRepoPaths(installationId, db, fullName, repoId);
  return <PopularContentChart traffic={{ paths }} />;
}
