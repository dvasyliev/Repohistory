import { StarsChart } from "./stars-chart";
import { ViewChart } from "./view-chart";
import { CloneChart } from "./clone-chart";
import { ReferrersChart } from "./referrers-chart";
import { PopularContentChart } from "./popular-content-chart";
import { getOwnerStars } from "@/lib/repo/owner-stars";
import { getOwnerViews } from "@/lib/repo/owner-views";
import { getOwnerClones } from "@/lib/repo/owner-clones";
import { getOwnerReferrers } from "@/lib/repo/owner-referrers";
import { getOwnerPaths } from "@/lib/repo/owner-paths";
import { getInstallationOctokit } from "@/lib/octokit/installation";
import type { Db } from "@/lib/db/client";
import type { Repo } from "@/lib/types";

interface OwnerStarsChartWrapperProps {
  owner: string;
  repos: Repo[];
}

export async function OwnerStarsChartWrapper({
  owner,
  repos,
}: OwnerStarsChartWrapperProps) {
  const octokit = await getInstallationOctokit(owner);
  const stars = await getOwnerStars(octokit, repos);
  return <StarsChart starsData={stars} />;
}

interface OwnerViewChartWrapperProps {
  repos: Repo[];
  db: Db;
}

export async function OwnerViewChartWrapper({
  repos,
  db,
}: OwnerViewChartWrapperProps) {
  const views = await getOwnerViews(db, repos);
  return <ViewChart traffic={{ views }} />;
}

interface OwnerCloneChartWrapperProps {
  repos: Repo[];
  db: Db;
}

export async function OwnerCloneChartWrapper({
  repos,
  db,
}: OwnerCloneChartWrapperProps) {
  const clones = await getOwnerClones(db, repos);
  return <CloneChart traffic={{ clones }} />;
}

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
