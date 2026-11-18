import type { App, Octokit } from "octokit";
import type { Db } from "@/lib/db/client";
import { fetchCounters, fetchForkDates } from "@/lib/repo/github-stats";
import { fetchStarWeeks } from "@/lib/repo/stars";
import {
  toDailyRows,
  toForkRows,
  toPathRows,
  toReferrerRows,
  toStarRows,
  type CounterRow,
  type ForkRow,
  type StarRow,
  upsertTraffic,
} from "@/lib/traffic-rows";

async function orNull<T>(
  fullName: string,
  kind: string,
  load: () => Promise<T>,
): Promise<T | null> {
  try {
    return await load();
  } catch (error) {
    console.error(
      fullName,
      `${kind} error`,
      error instanceof Error ? error.message : String(error),
    );
    return null;
  }
}

const fetchStarRows = (
  octokit: Octokit,
  fullName: string,
  repoId: number,
): Promise<StarRow[] | null> =>
  orNull(fullName, "stars", async () =>
    toStarRows(repoId, await fetchStarWeeks(octokit, fullName)),
  );

const fetchCounterRows = (
  octokit: Octokit,
  fullName: string,
  params: { owner: string; repo: string },
  date: string,
): Promise<CounterRow[] | null> =>
  orNull(fullName, "counters", async () => [
    await fetchCounters(octokit, params.owner, params.repo, date),
  ]);

const fetchForkRows = (
  octokit: Octokit,
  fullName: string,
  params: { owner: string; repo: string },
  repoId: number,
): Promise<ForkRow[] | null> =>
  orNull(fullName, "forks", async () =>
    toForkRows(
      repoId,
      await fetchForkDates(octokit, params.owner, params.repo),
    ),
  );

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

      const counterRows = await fetchCounterRows(
        octokit,
        repository.full_name,
        params,
        today,
      );
      const forkRows = await fetchForkRows(
        octokit,
        repository.full_name,
        params,
        repoId,
      );

      await upsertTraffic(db, {
        views: toDailyRows(repoId, viewsData.views),
        clones: toDailyRows(repoId, clonesData.clones),
        paths: toPathRows(repoId, pathsData, today),
        referrers: toReferrerRows(repoId, referrersData, today),
        stars: starRows ? { repoId, rows: starRows } : undefined,
        counters: counterRows ?? undefined,
        forks: forkRows ? { repoId, rows: forkRows } : undefined,
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
