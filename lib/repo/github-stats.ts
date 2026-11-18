import type { Octokit } from "octokit";
import type { CounterRow } from "@/lib/traffic-rows";

type CommitActivity = { week: number; days: number[] };
type ContributorStats = { weeks: { w: number; c: number }[] };
export type CommitDay = { date: string; commits: number };
export type CommitHistory = { days: CommitDay[]; weeks: CommitDay[] };

const FORKS_PER_PAGE = 100;
const MAX_FORK_PAGES = 30;

export async function fetchForkDates(
  octokit: Octokit,
  owner: string,
  repo: string,
): Promise<string[]> {
  const dates: string[] = [];
  for (let page = 1; page <= MAX_FORK_PAGES; page += 1) {
    const { data } = (await octokit.request("GET /repos/{owner}/{repo}/forks", {
      owner,
      repo,
      per_page: FORKS_PER_PAGE,
      page,
      sort: "oldest",
    })) as { data: { created_at: string }[] };
    dates.push(...data.map((fork) => fork.created_at));
    if (data.length < FORKS_PER_PAGE) break;
  }
  return dates;
}

async function fetchStat<T>(
  octokit: Octokit,
  route: string,
  owner: string,
  repo: string,
): Promise<T[] | null> {
  const { status, data } = (await octokit.request(route, {
    owner,
    repo,
  })) as { status: number; data: unknown };
  return status !== 202 && Array.isArray(data) ? (data as T[]) : null;
}

const DAY_SECONDS = 86_400;
const isoDate = (seconds: number) =>
  new Date(seconds * 1000).toISOString().slice(0, 10);

function toDays(activity: CommitActivity[], today: string): CommitDay[] {
  return activity
    .flatMap(({ week, days }) =>
      days.map((commits, index) => ({
        date: isoDate(week + index * DAY_SECONDS),
        commits,
      })),
    )
    .filter(({ date }) => date <= today);
}

function toWeeks(contributors: ContributorStats[]): CommitDay[] {
  const totals = new Map<number, number>();
  for (const { weeks } of contributors) {
    for (const { w, c } of weeks) totals.set(w, (totals.get(w) ?? 0) + c);
  }
  const sorted = [...totals.entries()].sort(([a], [b]) => a - b);
  const first = sorted.findIndex(([, commits]) => commits > 0);
  return first === -1
    ? []
    : sorted
        .slice(first)
        .map(([week, commits]) => ({ date: isoDate(week), commits }));
}

export async function fetchCommitHistory(
  octokit: Octokit,
  owner: string,
  repo: string,
): Promise<CommitHistory | null> {
  const [activity, contributors] = await Promise.all([
    fetchStat<CommitActivity>(
      octokit,
      "GET /repos/{owner}/{repo}/stats/commit_activity",
      owner,
      repo,
    ),
    fetchStat<ContributorStats>(
      octokit,
      "GET /repos/{owner}/{repo}/stats/contributors",
      owner,
      repo,
    ),
  ]);
  if (!activity || !contributors) return null;
  const today = new Date().toISOString().slice(0, 10);
  return { days: toDays(activity, today), weeks: toWeeks(contributors) };
}

export async function fetchCounters(
  octokit: Octokit,
  owner: string,
  repo: string,
  date: string,
): Promise<CounterRow> {
  const { data } = await octokit.request("GET /repos/{owner}/{repo}", {
    owner,
    repo,
  });
  return {
    repoId: Number(data.id),
    date,
    stars: data.stargazers_count,
    forks: data.forks_count,
    watchers: data.subscribers_count,
  };
}
