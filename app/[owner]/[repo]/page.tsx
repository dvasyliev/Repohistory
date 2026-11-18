import { Suspense } from "react";
import { DateRangeProvider } from "@/lib/contexts/date-range-context";
import type { Metadata } from "next";
import {
  StarsChartWrapper,
  ViewChartWrapper,
  CloneChartWrapper,
  ReferrersChartWrapper,
  PopularContentChartWrapper,
  ReleaseChartWrapper,
} from "@/app/components/charts/chart-wrappers";
import { Navbar } from "@/app/components/layout/navbar";
import { getRepoInfo } from "@/lib/repo/info";
import { getInstallationOctokit } from "@/lib/octokit/installation";
import { getDb } from "@/lib/db/client";
import { StarsChart } from "@/app/components/charts/stars-chart";
import { ViewChart } from "@/app/components/charts/view-chart";
import { CloneChart } from "@/app/components/charts/clone-chart";
import { ReferrersChart } from "@/app/components/charts/referrers-chart";
import { PopularContentChart } from "@/app/components/charts/popular-content-chart";
import { ReleaseChart } from "@/app/components/charts/release-chart";

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

  return (
    <DateRangeProvider fullName={repoInfo.full_name}>
      <div className="flex min-h-screen flex-col">
        <Navbar repoInfo={repoInfo} />
        <div className="container mx-auto space-y-6 p-4 sm:p-10">
          <Suspense fallback={<StarsChart isLoading />}>
            <StarsChartWrapper
              fullName={repoInfo.full_name}
              repoId={repoInfo.id}
              db={db}
              stargazersCount={repoInfo.stargazers_count}
            />
          </Suspense>
          <Suspense fallback={<ViewChart isLoading />}>
            <ViewChartWrapper
              fullName={fullName}
              repoId={repoInfo.id}
              db={db}
            />
          </Suspense>
          <Suspense fallback={<CloneChart isLoading />}>
            <CloneChartWrapper
              fullName={fullName}
              repoId={repoInfo.id}
              db={db}
            />
          </Suspense>
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
          <Suspense fallback={<ReleaseChart isLoading />}>
            <ReleaseChartWrapper fullName={fullName} />
          </Suspense>
        </div>
      </div>
    </DateRangeProvider>
  );
}
