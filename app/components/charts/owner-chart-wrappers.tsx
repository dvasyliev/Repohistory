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
  owner: string;
  repos: Repo[];
  db: Db;
}

export async function OwnerViewChartWrapper({
  owner,
  repos,
  db,
}: OwnerViewChartWrapperProps) {
  const octokit = await getInstallationOctokit(owner);
  const views = await getOwnerViews(octokit, db, repos);
  return <ViewChart traffic={{ views }} />;
}

interface OwnerCloneChartWrapperProps {
  owner: string;
  repos: Repo[];
  db: Db;
}

export async function OwnerCloneChartWrapper({
  owner,
  repos,
  db,
}: OwnerCloneChartWrapperProps) {
  const octokit = await getInstallationOctokit(owner);
  const clones = await getOwnerClones(octokit, db, repos);
  return <CloneChart traffic={{ clones }} />;
}

interface OwnerReferrersChartWrapperProps {
  owner: string;
  repos: Repo[];
  db: Db;
}

export async function OwnerReferrersChartWrapper({
  owner,
  repos,
  db,
}: OwnerReferrersChartWrapperProps) {
  const octokit = await getInstallationOctokit(owner);
  const { referrers } = await getOwnerReferrers(octokit, db, repos);
  return <ReferrersChart traffic={{ referrers }} />;
}

interface OwnerPopularContentChartWrapperProps {
  owner: string;
  repos: Repo[];
  db: Db;
}

export async function OwnerPopularContentChartWrapper({
  owner,
  repos,
  db,
}: OwnerPopularContentChartWrapperProps) {
  const octokit = await getInstallationOctokit(owner);
  const { paths } = await getOwnerPaths(octokit, db, repos);
  return <PopularContentChart traffic={{ paths }} />;
}
