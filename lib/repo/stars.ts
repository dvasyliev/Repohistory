import type { Octokit } from "octokit";
import { unstable_cache } from "next/cache";

export type StarWeek = { week: number; days: number[] };

const WEEKS_PER_PAGE = 30;
const MAX_PAGES = 100;
const DAY_MS = 86_400_000;

export interface RepoStarsData {
  totalStars: number;
  hasEstimatedData: boolean;
  starsHistory: Array<{
    date: string;
    cumulative: number;
    daily: number;
    isEstimated?: boolean;
  }>;
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

function toCumulativeDays(dailyStars: Record<string, number>) {
  const dates = Object.keys(dailyStars).sort();
  if (dates.length === 0) return [];

  const today = toIsoDate(Date.now());
  const history: RepoStarsData["starsHistory"] = [];
  let cumulative = 0;

  for (
    let ms = Date.parse(dates[0]) - DAY_MS;
    toIsoDate(ms) <= today;
    ms += DAY_MS
  ) {
    const date = toIsoDate(ms);
    const daily = dailyStars[date] ?? 0;
    cumulative += daily;
    history.push({ date, daily, cumulative, isEstimated: false });
  }

  return history;
}

function toCumulativeWeeks(weeks: StarWeek[]) {
  let cumulative = 0;
  return [...weeks]
    .sort((a, b) => a.week - b.week)
    .map(({ week, days }) => {
      const daily = days.reduce((sum, count) => sum + count, 0);
      cumulative += daily;
      return { date: toIsoDate(week * 1000), daily, cumulative };
    });
}

const emptyStars = (): RepoStarsData => ({
  totalStars: 0,
  hasEstimatedData: false,
  starsHistory: [],
});

export async function getRepoStars(
  octokit: Octokit,
  repo: { fullName: string; stargazersCount: number },
): Promise<RepoStarsData> {
  try {
    const weeks = await fetchStarWeeksCached(octokit, repo.fullName);
    return {
      totalStars: repo.stargazersCount,
      hasEstimatedData: false,
      starsHistory: toCumulativeDays(toDailyStars(weeks)),
    };
  } catch (error) {
    console.error("Error fetching stars data:", error);
    return emptyStars();
  }
}

export async function getRepoStarsChart(
  octokit: Octokit,
  repo: { fullName: string; stargazersCount: number },
): Promise<RepoStarsData> {
  try {
    const weeks = await fetchStarWeeksCached(octokit, repo.fullName);
    return {
      totalStars: repo.stargazersCount,
      hasEstimatedData: false,
      starsHistory: toCumulativeWeeks(weeks),
    };
  } catch (error) {
    console.error("Error fetching stars data:", error);
    return emptyStars();
  }
}
