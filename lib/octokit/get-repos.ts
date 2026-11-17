import { Repo } from "@/lib/types";
import { Octokit } from "octokit";
import { app } from "./app";

export async function getRepos(octokit: Octokit) {
  const { data: installationData } = await octokit.request(
    'GET /user/installations',
  );

  const installations = installationData.installations
    .filter(installation => installation.suspended_at === null);

  const repos: Repo[] = [];
  const reposByOwner: Record<string, Repo[]> = {};

  await Promise.all(installations.map(async (installation) => {
    const ownerRepos: Repo[] = [];
    await app.eachRepository({ installationId: installation.id }, ({ repository }) => {
      const repo = { ...repository, id: Number(repository.id) };
      repos.push(repo);
      ownerRepos.push(repo);
    });

    if (ownerRepos.length > 0 && installation.account) {
      const owner = 'login' in installation.account ? installation.account.login : installation.account.name;
      reposByOwner[owner] = ownerRepos;
    }
  }));

  return {
    repos,
    reposByOwner,
    shouldShowOwnerView: Object.values(reposByOwner).some(ownerRepos => ownerRepos.length > 1)
  };
}
