import { StarsChart } from "./stars-chart";
import { ViewChart } from "./view-chart";
import { CloneChart } from "./clone-chart";
import { ReferrersChart } from "./referrers-chart";
import { PopularContentChart } from "./popular-content-chart";
import { ReleaseChart } from "./release-chart";
import { getRepoStars } from "@/lib/repo/stars";
import { getRepoViews } from "@/lib/repo/views";
import { getRepoClones } from "@/lib/repo/clones";
import { getRepoReferrers } from "@/lib/repo/referrers";
import { getRepoPaths } from "@/lib/repo/paths";
import { getRepoReleases } from "@/lib/repo/releases";
import { getUserOctokit } from "@/lib/octokit/get-user-octokit";
import type { Db } from "@/lib/db/client";

interface StarsChartWrapperProps {
  fullName: string;
  stargazersCount: number;
}

export async function StarsChartWrapper({
  fullName,
  stargazersCount,
}: StarsChartWrapperProps) {
  const octokit = await getUserOctokit();
  const stars = await getRepoStars(octokit, {
    fullName,
    stargazersCount,
  });
  return <StarsChart starsData={stars} />;
}

interface ViewChartWrapperProps {
  fullName: string;
  repoId: number;
  db: Db;
}

export async function ViewChartWrapper({
  fullName,
  repoId,
  db,
}: ViewChartWrapperProps) {
  const octokit = await getUserOctokit();
  const views = await getRepoViews(octokit, db, fullName, repoId);
  return <ViewChart traffic={{ views }} />;
}

interface CloneChartWrapperProps {
  fullName: string;
  repoId: number;
  db: Db;
}

export async function CloneChartWrapper({
  fullName,
  repoId,
  db,
}: CloneChartWrapperProps) {
  const octokit = await getUserOctokit();
  const clones = await getRepoClones(octokit, db, fullName, repoId);
  return <CloneChart traffic={{ clones }} />;
}

interface ReferrersChartWrapperProps {
  fullName: string;
  repoId: number;
  db: Db;
}

export async function ReferrersChartWrapper({
  fullName,
  repoId,
  db,
}: ReferrersChartWrapperProps) {
  const octokit = await getUserOctokit();
  const { referrers } = await getRepoReferrers(octokit, db, fullName, repoId);
  return <ReferrersChart traffic={{ referrers }} />;
}

interface PopularContentChartWrapperProps {
  fullName: string;
  repoId: number;
  db: Db;
}

export async function PopularContentChartWrapper({
  fullName,
  repoId,
  db,
}: PopularContentChartWrapperProps) {
  const octokit = await getUserOctokit();
  const { paths } = await getRepoPaths(octokit, db, fullName, repoId);
  return <PopularContentChart traffic={{ paths }} />;
}

interface ReleaseChartWrapperProps {
  fullName: string;
}

export async function ReleaseChartWrapper({
  fullName,
}: ReleaseChartWrapperProps) {
  const octokit = await getUserOctokit();
  const [owner, repo] = fullName.split("/");
  const releases = await getRepoReleases(octokit, owner, repo);
  return <ReleaseChart releasesData={releases} />;
}
