import type { Octokit } from "octokit";
import { describe, expect, it, vi } from "vitest";
import {
  fetchCommitHistory,
  fetchCounters,
  fetchForkDates,
} from "./github-stats";

type Reply = { status: number; data: unknown };

function fakeOctokit(replies: Record<string, Reply[]>) {
  const request = vi.fn((route: string) => {
    const queue = replies[route];
    return Promise.resolve(queue.length > 1 ? queue.shift() : queue[0]);
  });
  return { octokit: { request } as unknown as Octokit, request };
}

const activityRoute = "GET /repos/{owner}/{repo}/stats/commit_activity";
const contributorsRoute = "GET /repos/{owner}/{repo}/stats/contributors";

describe("fetchCommitHistory", () => {
  const week = Date.UTC(2026, 10, 15) / 1000;
  const activity = [{ week, days: [0, 2, 0, 1, 5, 0, 0] }];
  const weekSeconds = 7 * 86_400;
  const contributors = [
    {
      weeks: [
        { w: week - 2 * weekSeconds, c: 0 },
        { w: week - weekSeconds, c: 3 },
        { w: week, c: 1 },
      ],
    },
    { weeks: [{ w: week, c: 2 }] },
  ];

  it("returns daily commits up to today and weekly totals from the first commit", async () => {
    vi.useFakeTimers({ now: new Date("2026-11-18T12:00:00Z") });
    const { octokit } = fakeOctokit({
      [activityRoute]: [{ status: 200, data: activity }],
      [contributorsRoute]: [{ status: 200, data: contributors }],
    });
    expect(await fetchCommitHistory(octokit, "o", "r")).toEqual({
      days: [
        { date: "2026-11-15", commits: 0 },
        { date: "2026-11-16", commits: 2 },
        { date: "2026-11-17", commits: 0 },
        { date: "2026-11-18", commits: 1 },
      ],
      weeks: [
        { date: "2026-11-08", commits: 3 },
        { date: "2026-11-15", commits: 3 },
      ],
    });
    vi.useRealTimers();
  });

  it("returns null at once when either stat answers 202", async () => {
    const { octokit, request } = fakeOctokit({
      [activityRoute]: [{ status: 200, data: activity }],
      [contributorsRoute]: [{ status: 202, data: {} }],
    });
    expect(await fetchCommitHistory(octokit, "o", "r")).toBeNull();
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("returns null when a 200 body is not an array", async () => {
    const { octokit } = fakeOctokit({
      [activityRoute]: [{ status: 200, data: {} }],
      [contributorsRoute]: [{ status: 200, data: contributors }],
    });
    expect(await fetchCommitHistory(octokit, "o", "r")).toBeNull();
  });
});

describe("fetchForkDates", () => {
  const route = "GET /repos/{owner}/{repo}/forks";
  const page = (n: number) =>
    Array.from({ length: n }, () => ({ created_at: "2026-11-01T00:00:00Z" }));

  it("pages until a short page", async () => {
    const { octokit, request } = fakeOctokit({
      [route]: [
        { status: 200, data: page(100) },
        { status: 200, data: page(3) },
      ],
    });
    expect(await fetchForkDates(octokit, "o", "r")).toHaveLength(103);
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("stops after 30 pages", async () => {
    const { octokit, request } = fakeOctokit({
      [route]: [{ status: 200, data: page(100) }],
    });
    expect(await fetchForkDates(octokit, "o", "r")).toHaveLength(3000);
    expect(request).toHaveBeenCalledTimes(30);
  });
});

describe("fetchCounters", () => {
  it("maps the repository fields", async () => {
    const { octokit } = fakeOctokit({
      "GET /repos/{owner}/{repo}": [
        {
          status: 200,
          data: {
            id: 7,
            stargazers_count: 5,
            forks_count: 2,
            subscribers_count: 3,
            open_issues_count: 1,
          },
        },
      ],
    });
    expect(await fetchCounters(octokit, "o", "r", "2026-11-18")).toEqual({
      repoId: 7,
      date: "2026-11-18",
      stars: 5,
      forks: 2,
      watchers: 3,
    });
  });
});
