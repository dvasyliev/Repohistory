import { dailyCache } from "@/lib/daily-cache";
import { getOctokitForInstallation } from "@/lib/octokit/installation";

export const getRepoInfo = dailyCache(
  "github-repo-info",
  async (installationId: number, owner: string, repo: string) => {
    const octokit = await getOctokitForInstallation(installationId);
    const { data } = await octokit.rest.repos.get({ owner, repo });
    return data;
  },
);
