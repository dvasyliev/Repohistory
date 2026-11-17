import { Suspense } from "react";
import { DateRangeProvider } from "@/lib/contexts/date-range-context";
import {
  OwnerStarsChartWrapper,
  OwnerViewChartWrapper,
  OwnerCloneChartWrapper,
  OwnerReferrersChartWrapper,
  OwnerPopularContentChartWrapper,
} from "@/app/components/charts/owner-chart-wrappers";
import { Navbar } from "@/app/components/layout/navbar";
import { getRepos } from "@/lib/octokit/get-repos";
import { getDb } from "@/lib/db/client";
import { redirect } from "next/navigation";
import { StarsChart } from "@/app/components/charts/stars-chart";
import { ViewChart } from "@/app/components/charts/view-chart";
import { CloneChart } from "@/app/components/charts/clone-chart";
import { ReferrersChart } from "@/app/components/charts/referrers-chart";
import { PopularContentChart } from "@/app/components/charts/popular-content-chart";

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

  return (
    <DateRangeProvider fullName={owner}>
      <div className="flex min-h-screen flex-col">
        <Navbar ownerInfo={ownerInfo} />
        <div className="container mx-auto space-y-6 p-4 sm:p-10">
          <Suspense fallback={<StarsChart isLoading />}>
            <OwnerStarsChartWrapper owner={owner} repos={ownerRepos} />
          </Suspense>
          <Suspense fallback={<ViewChart isLoading />}>
            <OwnerViewChartWrapper owner={owner} repos={ownerRepos} db={db} />
          </Suspense>
          <Suspense fallback={<CloneChart isLoading />}>
            <OwnerCloneChartWrapper owner={owner} repos={ownerRepos} db={db} />
          </Suspense>
          <Suspense fallback={<ReferrersChart isLoading />}>
            <OwnerReferrersChartWrapper
              owner={owner}
              repos={ownerRepos}
              db={db}
            />
          </Suspense>
          <Suspense fallback={<PopularContentChart isLoading />}>
            <OwnerPopularContentChartWrapper
              owner={owner}
              repos={ownerRepos}
              db={db}
            />
          </Suspense>
        </div>
      </div>
    </DateRangeProvider>
  );
}
