import { DashboardViews } from "@/app/components/repo/dashboard-views";
import { RepoGrid } from "@/app/components/repo/repo-grid";
import { OwnerGrid } from "@/app/components/repo/owner-grid";
import { getDb } from "@/lib/db/client";
import { getRecentViewTotals } from "@/lib/db/traffic";
import { getRepos } from "@/lib/octokit/get-repos";

const VIEW_WINDOW_DAYS = 14;

async function getViews14(repoIds: number[]): Promise<Map<number, number>> {
  const since = new Date(Date.now() - (VIEW_WINDOW_DAYS - 1) * 86_400_000)
    .toISOString()
    .slice(0, 10);
  try {
    return await getRecentViewTotals(getDb(), repoIds, since);
  } catch (error) {
    console.error("Failed to load recent views", error);
    return new Map();
  }
}

export default async function DashboardContent() {
  const { repos, reposByOwner } = await getRepos();
  const views14 = await getViews14(repos.map((repo) => repo.id));

  return (
    <DashboardViews
      repoView={<RepoGrid repos={repos} views14={views14} />}
      ownerView={<OwnerGrid reposByOwner={reposByOwner} />}
    />
  );
}
