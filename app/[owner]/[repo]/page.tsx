import { Suspense } from "react";
import { DateRangeProvider } from "@/lib/contexts/date-range-context";
import type { Metadata } from "next";
import {
  ReferrersChartWrapper,
  PopularContentChartWrapper,
} from "@/app/components/charts/chart-wrappers";
import { Navbar } from "@/app/components/layout/navbar";
import { getRepoInfo } from "@/lib/repo/info";
import { getInstallationOctokit } from "@/lib/octokit/installation";
import { getDb } from "@/lib/db/client";
import { ReferrersChart } from "@/app/components/charts/referrers-chart";
import { PopularContentChart } from "@/app/components/charts/popular-content-chart";
import { getRepoStars } from "@/lib/repo/stars";
import { getRepoViews } from "@/lib/repo/views";
import { getRepoClones } from "@/lib/repo/clones";
import {
  getRepoCommitWeeks,
  getRepoCounters,
  getRepoForks,
} from "@/lib/repo/repo-stats";
import {
  RepoInsights,
  type RepoInsightsData,
} from "@/app/[owner]/[repo]/_components/repo-insights";

interface PageProps {
  params: Promise<{
    owner: string;
    repo: string;
  }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { owner, repo } = await params;

  return {
    title: `${owner}/${repo} | Repohistory`,
  };
}

export default async function RepoPage({ params }: PageProps) {
  const { owner, repo } = await params;

  if (owner === "icons") {
    return;
  }

  const db = getDb();
  const fullName = `${owner}/${repo}`;
  const octokit = await getInstallationOctokit(owner);
  const repoInfo = await getRepoInfo(octokit, owner, repo);
  const insights: RepoInsightsData = {
    views: getRepoViews(octokit, db, fullName, repoInfo.id),
    clones: getRepoClones(octokit, db, fullName, repoInfo.id),
    stars: getRepoStars(db, {
      id: repoInfo.id,
      fullName: repoInfo.full_name,
      stargazersCount: repoInfo.stargazers_count,
    }),
    forks: getRepoForks(db, repoInfo.id),
    commits: getRepoCommitWeeks(octokit, owner, repo),
    counters: getRepoCounters(db, repoInfo.id),
  };

  return (
    <DateRangeProvider fullName={repoInfo.full_name}>
      <div className="flex min-h-screen flex-col">
        <Navbar repoInfo={repoInfo} />
        <div className="container mx-auto space-y-6 p-4 sm:p-10">
          <RepoInsights data={insights} />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Suspense fallback={<ReferrersChart isLoading />}>
              <ReferrersChartWrapper
                fullName={fullName}
                repoId={repoInfo.id}
                db={db}
              />
            </Suspense>
            <Suspense fallback={<PopularContentChart isLoading />}>
              <PopularContentChartWrapper
                fullName={fullName}
                repoId={repoInfo.id}
                db={db}
              />
            </Suspense>
          </div>
        </div>
      </div>
    </DateRangeProvider>
  );
}
