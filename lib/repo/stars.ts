import type { Octokit } from "octokit";
import { unstable_cache } from "next/cache";
import type { Db } from "@/lib/db/client";
import { getStarHistory, type StarHistory } from "@/lib/db/traffic";
import {
  toDailyCounts,
  type CumulativeDay,
  type DailyCount,
} from "./cumulative";

export type StarWeek = { week: number; days: number[] };

const WEEKS_PER_PAGE = 30;
const MAX_PAGES = 100;
const DAY_MS = 86_400_000;

export interface RepoStarsData {
  totalStars: number;
  starsHistory: DailyCount[];
}

const toIsoDate = (ms: number) => new Date(ms).toISOString().split("T")[0];

export async function fetchStarWeeks(
  octokit: Octokit,
  fullName: string,
): Promise<StarWeek[]> {
  const [owner, repo] = fullName.split("/");
  const weeks: StarWeek[] = [];

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const { data } = (await octokit.request(
      "GET /repos/{owner}/{repo}/stargazers/history",
      { owner, repo, per_page: WEEKS_PER_PAGE, page },
    )) as { data: StarWeek[] };
    weeks.push(...data);
    if (data.length < WEEKS_PER_PAGE) break;
  }

  return weeks;
}

function fetchStarWeeksCached(octokit: Octokit, fullName: string) {
  return unstable_cache(
    () => fetchStarWeeks(octokit, fullName),
    ["star-weeks", fullName],
    { revalidate: 21_600, tags: [`stargazers-${fullName}`] },
  )();
}

export function toDailyStars(weeks: StarWeek[]): Record<string, number> {
  const daily: Record<string, number> = {};
  for (const { week, days } of weeks) {
    days.forEach((count, index) => {
      if (count > 0) daily[toIsoDate(week * 1000 + index * DAY_MS)] = count;
    });
  }
  return daily;
}

function toCumulativeWeeks(weeks: StarWeek[]): CumulativeDay[] {
  let cumulative = 0;
  return [...weeks]
    .sort((a, b) => a.week - b.week)
    .map(({ week, days }) => {
      const daily = days.reduce((sum, count) => sum + count, 0);
      cumulative += daily;
      return { date: toIsoDate(week * 1000), daily, cumulative };
    });
}

export async function getRepoStars(
  db: Db,
  repo: { id: number; fullName: string; stargazersCount: number },
  stored?: StarHistory[],
): Promise<RepoStarsData> {
  const rows = stored ?? (await getStarHistory(db, repo.id));
  return {
    totalStars: repo.stargazersCount,
    starsHistory: toDailyCounts(rows),
  };
}

export async function getRepoStarsChart(
  octokit: Octokit,
  repo: { fullName: string; stargazersCount: number },
): Promise<{ totalStars: number; starsHistory: CumulativeDay[] }> {
  const weeks = await fetchStarWeeksCached(octokit, repo.fullName);
  return {
    totalStars: repo.stargazersCount,
    starsHistory: toCumulativeWeeks(weeks),
  };
}
