import type { Octokit } from "octokit";
import { describe, expect, it, vi } from "vitest";
import {
  fetchCommitWeeks,
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

describe("fetchCommitWeeks", () => {
  const week = Date.UTC(2026, 10, 1) / 1000;
  const activity = [{ week, total: 2 }];

  it("returns commits by week", async () => {
    const { octokit } = fakeOctokit({
      [activityRoute]: [{ status: 200, data: activity }],
    });
    expect(await fetchCommitWeeks(octokit, "o", "r")).toEqual([
      { week: "2026-11-01", commits: 2 },
    ]);
  });

  it("returns null at once on a 202, with one call", async () => {
    const { octokit, request } = fakeOctokit({
      [activityRoute]: [{ status: 202, data: {} }],
    });
    expect(await fetchCommitWeeks(octokit, "o", "r")).toBeNull();
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("returns null when a 200 body is not an array", async () => {
    const { octokit } = fakeOctokit({
      [activityRoute]: [{ status: 200, data: {} }],
    });
    expect(await fetchCommitWeeks(octokit, "o", "r")).toBeNull();
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
