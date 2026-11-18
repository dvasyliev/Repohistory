import { describe, expect, it, vi } from "vitest";
import type { Octokit } from "octokit";
import type { Db } from "@/lib/db/client";
import type { Repo } from "@/lib/types";

const getForkHistoryForRepos = vi.hoisted(() => vi.fn());
const getDailyCountTotals = vi.hoisted(() => vi.fn());
const getCounterHistory = vi.hoisted(() => vi.fn());
const fetchCommitWeeks = vi.hoisted(() => vi.fn());
vi.mock("@/lib/db/traffic", () => ({
  getForkHistoryForRepos,
  getDailyCountTotals,
  getCounterHistory,
}));
vi.mock("@/lib/repo/github-stats", () => ({ fetchCommitWeeks }));
vi.mock("next/cache", () => ({
  unstable_cache: <T>(fn: () => Promise<T>) => fn,
}));

import {
  getOwnerForks,
  getRepoCommitWeeks,
  getRepoCounters,
  getRepoForks,
} from "./repo-stats";

const db = {} as Db;

describe("getRepoForks", () => {
  it("builds a cumulative series from the day before the first fork", async () => {
    getForkHistoryForRepos.mockResolvedValue(
      new Map([
        [
          1,
          [
            { date: "2026-11-01", count: 2 },
            { date: "2026-11-03", count: 1 },
          ],
        ],
      ]),
    );
    const result = await getRepoForks(db, 1);
    expect(result[0]).toMatchObject({ date: "2026-10-31", cumulative: 0 });
    expect(result.find((d) => d.date === "2026-11-01")).toMatchObject({
      daily: 2,
      cumulative: 2,
    });
    expect(result.find((d) => d.date === "2026-11-03")).toMatchObject({
      daily: 1,
      cumulative: 3,
    });
  });

  it("gives an empty series when there are no rows", async () => {
    getForkHistoryForRepos.mockResolvedValue(new Map());
    expect(await getRepoForks(db, 1)).toEqual([]);
  });

  it("gives an empty series and logs when the D1 read fails", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    getForkHistoryForRepos.mockReturnValue(Promise.reject(new Error("down")));
    expect(await getRepoForks(db, 1)).toEqual([]);
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });
});

describe("getOwnerForks", () => {
  it("builds the series from the forks summed per day", async () => {
    getDailyCountTotals.mockResolvedValue([
      { date: "2026-11-01", count: 3 },
      { date: "2026-11-02", count: 4 },
    ]);
    const result = await getOwnerForks(db, [{ id: 1 }, { id: 2 }] as Repo[]);
    expect(result.find((d) => d.date === "2026-11-01")).toMatchObject({
      daily: 3,
      cumulative: 3,
    });
    expect(result.find((d) => d.date === "2026-11-02")).toMatchObject({
      daily: 4,
      cumulative: 7,
    });
  });

  it("gives an empty series and logs when the D1 read fails", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    getDailyCountTotals.mockReturnValue(Promise.reject(new Error("down")));
    expect(await getOwnerForks(db, [{ id: 1 }] as Repo[])).toEqual([]);
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });
});

describe("getRepoCounters", () => {
  it("passes rows through", async () => {
    getCounterHistory.mockResolvedValue([
      { date: "2026-11-01", stars: 1, forks: 2, watchers: 3 },
    ]);
    expect(await getRepoCounters(db, 1)).toHaveLength(1);
  });

  it("gives an empty list and logs when D1 fails", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    getCounterHistory.mockReturnValue(Promise.reject(new Error("down")));
    expect(await getRepoCounters(db, 1)).toEqual([]);
    expect(error).toHaveBeenCalledTimes(1);
    error.mockRestore();
  });
});

describe("getRepoCommitWeeks", () => {
  const octokit = {} as Octokit;

  it("passes GitHub weeks through, and null while GitHub computes", async () => {
    const weeks = [{ week: "2026-11-01", commits: 1 }];
    fetchCommitWeeks.mockResolvedValueOnce(weeks).mockResolvedValueOnce(null);
    expect(await getRepoCommitWeeks(octokit, "o", "r")).toEqual(weeks);
    expect(await getRepoCommitWeeks(octokit, "o", "r")).toBeNull();
  });

  it("gives an empty list and logs when GitHub fails", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchCommitWeeks.mockReturnValue(Promise.reject(new Error("down")));
    expect(await getRepoCommitWeeks(octokit, "o", "r")).toEqual([]);
    expect(error).toHaveBeenCalledTimes(1);
    error.mockRestore();
  });
});
