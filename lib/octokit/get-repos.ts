import { cache } from "react";
import type { Repo } from "@/lib/types";
import { dailyCache } from "@/lib/daily-cache";
import { getApp } from "./app";

const fetchRepos = dailyCache("github-repos", async () => {
  const repos: Repo[] = [];
  const reposByOwner: Record<string, Repo[]> = {};

  await getApp().eachInstallation(async ({ installation }) => {
    if (installation.suspended_at !== null) return;

    const ownerRepos: Repo[] = [];
    await getApp().eachRepository(
      { installationId: installation.id },
      ({ repository }) => {
        const repo: Repo = {
          id: Number(repository.id),
          name: repository.name,
          full_name: repository.full_name,
          stargazers_count: repository.stargazers_count,
          forks_count: repository.forks_count,
          pushed_at: repository.pushed_at,
          description: repository.description,
        };
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
});

export const getRepos = cache(() => fetchRepos());
