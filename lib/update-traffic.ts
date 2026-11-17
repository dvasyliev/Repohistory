import type { Db } from "@/lib/db/client";
import { getApp } from "@/lib/octokit/app";
import {
  toDailyRows,
  toPathRows,
  toReferrerRows,
  upsertTraffic,
} from "@/lib/traffic-rows";

export async function updateTraffic(installationId: number, db: Db) {
  const octokit = await getApp().getInstallationOctokit(installationId);
  const today = new Date().toISOString().slice(0, 10);

  await getApp().eachRepository({ installationId }, async ({ repository }) => {
    try {
      const params = { owner: repository.owner.login, repo: repository.name };
      const repoId = Number(repository.id);
      const { data: viewsData } = await octokit.rest.repos.getViews(params);
      const { data: clonesData } = await octokit.rest.repos.getClones(params);
      const { data: pathsData } = await octokit.rest.repos.getTopPaths(params);
      const { data: referrersData } =
        await octokit.rest.repos.getTopReferrers(params);

      await upsertTraffic(db, {
        views: toDailyRows(repoId, viewsData.views),
        clones: toDailyRows(repoId, clonesData.clones),
        paths: toPathRows(repoId, pathsData, today),
        referrers: toReferrerRows(repoId, referrersData, today),
      });
    } catch (error) {
      console.error(
        repository.full_name,
        "error",
        error instanceof Error ? error.message : String(error),
      );
    }
  });
}
