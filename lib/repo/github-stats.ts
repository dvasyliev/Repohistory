import type { Octokit } from "octokit";
import type { CounterRow } from "@/lib/traffic-rows";

type CommitActivity = { week: number; total: number };
export type CommitWeek = { week: string; commits: number };

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

const weekDate = (week: number) =>
  new Date(week * 1000).toISOString().slice(0, 10);

export async function fetchCommitWeeks(
  octokit: Octokit,
  owner: string,
  repo: string,
): Promise<CommitWeek[] | null> {
  const activity = await fetchStat<CommitActivity>(
    octokit,
    "GET /repos/{owner}/{repo}/stats/commit_activity",
    owner,
    repo,
  );
  return (
    activity?.map(({ week, total }) => ({
      week: weekDate(week),
      commits: total,
    })) ?? null
  );
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
