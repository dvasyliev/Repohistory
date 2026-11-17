import { DashboardViews } from "@/app/components/repo/dashboard-views";
import { getUserOctokit } from "@/lib/octokit/get-user-octokit";
import { RepoGrid } from "@/app/components/repo/repo-grid";
import { OwnerGrid } from "@/app/components/repo/owner-grid";
import { getRepos } from "@/lib/octokit/get-repos";

export default async function DashboardContent() {
  const octokit = await getUserOctokit();
  const { repos, reposByOwner } = await getRepos(octokit);

  return (
    <DashboardViews
      repoView={<RepoGrid repos={repos} />}
      ownerView={<OwnerGrid reposByOwner={reposByOwner} />}
    />
  );
}
