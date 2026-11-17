import type { Repo } from "@/lib/types";
import { getApp } from "./app";

export async function getRepos() {
  const repos: Repo[] = [];
  const reposByOwner: Record<string, Repo[]> = {};

  await getApp().eachInstallation(async ({ installation }) => {
    if (installation.suspended_at !== null) return;

    const ownerRepos: Repo[] = [];
    await getApp().eachRepository(
      { installationId: installation.id },
      ({ repository }) => {
        const repo = { ...repository, id: Number(repository.id) };
        repos.push(repo);
        ownerRepos.push(repo);
      },
    );

    if (ownerRepos.length > 0 && installation.account) {
      const owner = installation.account.login;
      reposByOwner[owner] = ownerRepos;
    }
  });

  return {
    repos,
    reposByOwner,
    shouldShowOwnerView: Object.values(reposByOwner).some(
      (ownerRepos) => ownerRepos.length > 1,
    ),
  };
}
