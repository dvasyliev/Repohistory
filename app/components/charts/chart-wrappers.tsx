import { StarsChart } from "./stars-chart";
import { ViewChart } from "./view-chart";
import { CloneChart } from "./clone-chart";
import { ReferrersChart } from "./referrers-chart";
import { PopularContentChart } from "./popular-content-chart";
import { ReleaseChart } from "./release-chart";
import { ForksChart } from "./forks-chart";
import { CountersChart } from "./counters-chart";
import { CommitActivityChart } from "./commit-activity-chart";
import { getRepoStars } from "@/lib/repo/stars";
import { getRepoViews } from "@/lib/repo/views";
import { getRepoClones } from "@/lib/repo/clones";
import { getRepoReferrers } from "@/lib/repo/referrers";
import { getRepoPaths } from "@/lib/repo/paths";
import { getRepoReleases } from "@/lib/repo/releases";
import {
  getRepoCommitWeeks,
  getRepoCounters,
  getRepoForks,
} from "@/lib/repo/repo-stats";
import { getInstallationOctokit } from "@/lib/octokit/installation";
import type { Db } from "@/lib/db/client";

interface StarsChartWrapperProps {
  fullName: string;
  repoId: number;
  db: Db;
  stargazersCount: number;
}

export async function StarsChartWrapper({
  fullName,
  repoId,
  db,
  stargazersCount,
}: StarsChartWrapperProps) {
  const stars = await getRepoStars(db, {
    id: repoId,
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
  const octokit = await getInstallationOctokit(fullName.split("/")[0]);
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
  const octokit = await getInstallationOctokit(fullName.split("/")[0]);
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
  const octokit = await getInstallationOctokit(fullName.split("/")[0]);
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
  const octokit = await getInstallationOctokit(fullName.split("/")[0]);
  const { paths } = await getRepoPaths(octokit, db, fullName, repoId);
  return <PopularContentChart traffic={{ paths }} />;
}

interface ReleaseChartWrapperProps {
  fullName: string;
}

export async function ReleaseChartWrapper({
  fullName,
}: ReleaseChartWrapperProps) {
  const octokit = await getInstallationOctokit(fullName.split("/")[0]);
  const [owner, repo] = fullName.split("/");
  const releases = await getRepoReleases(octokit, owner, repo);
  return <ReleaseChart releasesData={releases} />;
}

interface RepoStatsChartWrapperProps {
  repoId: number;
  db: Db;
}

export async function ForksChartWrapper({
  repoId,
  db,
}: RepoStatsChartWrapperProps) {
  const forks = await getRepoForks(db, repoId);
  return <ForksChart forksData={forks} />;
}

export async function CountersChartWrapper({
  repoId,
  db,
}: RepoStatsChartWrapperProps) {
  const counters = await getRepoCounters(db, repoId);
  return <CountersChart counters={counters} />;
}

export async function CommitActivityChartWrapper({
  repoId,
  db,
}: RepoStatsChartWrapperProps) {
  const weeks = await getRepoCommitWeeks(db, repoId);
  return <CommitActivityChart weeks={weeks} />;
}
