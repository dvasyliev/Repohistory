import type { App, Octokit } from "octokit";
import type { Db } from "@/lib/db/client";
import { fetchStarWeeks } from "@/lib/repo/stars";
import {
  toDailyRows,
  toPathRows,
  toReferrerRows,
  toStarRows,
  type StarRow,
  upsertTraffic,
} from "@/lib/traffic-rows";

async function fetchStarRows(
  octokit: Octokit,
  fullName: string,
  repoId: number,
): Promise<StarRow[] | null> {
  try {
    return toStarRows(repoId, await fetchStarWeeks(octokit, fullName));
  } catch (error) {
    console.error(
      fullName,
      "stars error",
      error instanceof Error ? error.message : String(error),
    );
    return null;
  }
}

export async function updateTraffic(app: App, installationId: number, db: Db) {
  const octokit = await app.getInstallationOctokit(installationId);
  const today = new Date().toISOString().slice(0, 10);

  await app.eachRepository({ installationId }, async ({ repository }) => {
    try {
      const params = { owner: repository.owner.login, repo: repository.name };
      const repoId = Number(repository.id);
      const { data: viewsData } = await octokit.rest.repos.getViews(params);
      const { data: clonesData } = await octokit.rest.repos.getClones(params);
      const { data: pathsData } = await octokit.rest.repos.getTopPaths(params);
      const { data: referrersData } =
        await octokit.rest.repos.getTopReferrers(params);

      const starRows = await fetchStarRows(
        octokit,
        repository.full_name,
        repoId,
      );

      await upsertTraffic(db, {
        views: toDailyRows(repoId, viewsData.views),
        clones: toDailyRows(repoId, clonesData.clones),
        paths: toPathRows(repoId, pathsData, today),
        referrers: toReferrerRows(repoId, referrersData, today),
        stars: starRows ? { repoId, rows: starRows } : undefined,
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
