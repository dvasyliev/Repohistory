import { Suspense } from "react";
import { DateRangeProvider } from "@/lib/contexts/date-range-context";
import {
  OwnerReferrersChartWrapper,
  OwnerPopularContentChartWrapper,
} from "@/app/components/charts/owner-chart-wrappers";
import { Navbar } from "@/app/components/layout/navbar";
import { ChartErrorBoundary } from "@/app/components/charts/chart-error-boundary";
import { getRepos } from "@/lib/octokit/get-repos";
import { getInstallationId } from "@/lib/octokit/installation";
import { getDb } from "@/lib/db/client";
import { redirect } from "next/navigation";
import { ReferrersChart } from "@/app/components/charts/referrers-chart";
import { PopularContentChart } from "@/app/components/charts/popular-content-chart";
import {
  Insights,
  type InsightsData,
} from "@/app/components/insights/insights";
import { getOwnerStars } from "@/lib/repo/owner-stars";
import { getOwnerViews } from "@/lib/repo/owner-views";
import { getOwnerClones } from "@/lib/repo/owner-clones";
import {
  getOwnerCommits,
  getOwnerCounters,
  getOwnerForks,
} from "@/lib/repo/repo-stats";
interface PageProps {
  params: Promise<{
    owner: string;
  }>;
}

export default async function OwnerPage({ params }: PageProps) {
  const { reposByOwner } = await getRepos();

  const { owner } = await params;
  const ownerRepos = reposByOwner[owner];
  if (!ownerRepos || ownerRepos.length === 0) {
    redirect("/");
  }

  const totalStars = ownerRepos.reduce(
    (sum, repo) => sum + repo.stargazers_count,
    0,
  );
  const ownerInfo = {
    name: owner,
    totalRepositories: ownerRepos.length,
    totalStars,
  };

  const db = getDb();
  const installationId = await getInstallationId(owner);
  const insights: InsightsData = {
    views: getOwnerViews(db, ownerRepos),
    clones: getOwnerClones(db, ownerRepos),
    stars: getOwnerStars(db, ownerRepos),
    forks: getOwnerForks(db, ownerRepos),
    commits: getOwnerCommits(installationId, owner, ownerRepos),
    counters: getOwnerCounters(db, ownerRepos),
  };

  return (
    <DateRangeProvider fullName={owner}>
      <div className="flex min-h-screen flex-col">
        <Navbar ownerInfo={ownerInfo} />
        <div className="container mx-auto space-y-6 p-4 sm:p-10">
          <Insights data={insights} />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ChartErrorBoundary name="referrers">
              <Suspense fallback={<ReferrersChart isLoading />}>
                <OwnerReferrersChartWrapper repos={ownerRepos} db={db} />
              </Suspense>
            </ChartErrorBoundary>
            <ChartErrorBoundary name="popular content">
              <Suspense fallback={<PopularContentChart isLoading />}>
                <OwnerPopularContentChartWrapper repos={ownerRepos} db={db} />
              </Suspense>
            </ChartErrorBoundary>
          </div>
        </div>
      </div>
    </DateRangeProvider>
  );
}
