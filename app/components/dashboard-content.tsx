import { DashboardViews } from "@/app/components/repo/dashboard-views";
import { RepoGrid } from "@/app/components/repo/repo-grid";
import { OwnerGrid } from "@/app/components/repo/owner-grid";
import { getDb } from "@/lib/db/client";
import { getRecentViewsForRepos, type DailyHistory } from "@/lib/db/traffic";
import { cardViewsSince } from "@/lib/repo/card-views";
import { getRepos } from "@/lib/octokit/get-repos";

const VIEW_WINDOW_DAYS = 14;

function sumViews14(recentViews: Map<number, DailyHistory[]>) {
  const since = new Date(Date.now() - (VIEW_WINDOW_DAYS - 1) * 86_400_000)
    .toISOString()
    .slice(0, 10);
  return new Map(
    [...recentViews].map(([repoId, days]) => [
      repoId,
      days
        .filter((day) => day.date >= since)
        .reduce((sum, day) => sum + day.total, 0),
    ]),
  );
}

export default async function DashboardContent() {
  const { repos, reposByOwner } = await getRepos();
  const recentViews = await getRecentViewsForRepos(
    getDb(),
    repos.map((repo) => repo.id),
    cardViewsSince(),
  );

  return (
    <DashboardViews
      repoView={
        <RepoGrid
          repos={repos}
          recentViews={recentViews}
          views14={sumViews14(recentViews)}
        />
      }
      ownerView={
        <OwnerGrid reposByOwner={reposByOwner} recentViews={recentViews} />
      }
    />
  );
}
