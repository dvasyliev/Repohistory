import { DashboardViews } from "@/app/components/repo/dashboard-views";
import { RepoGrid } from "@/app/components/repo/repo-grid";
import { OwnerGrid } from "@/app/components/repo/owner-grid";
import { getRepos } from "@/lib/octokit/get-repos";

export default async function DashboardContent() {
  const { repos, reposByOwner } = await getRepos();

  return (
    <DashboardViews
      repoView={<RepoGrid repos={repos} />}
      ownerView={<OwnerGrid reposByOwner={reposByOwner} />}
    />
  );
}
