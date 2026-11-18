import { describe, expect, it, vi } from "vitest";
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
vi.mock("@/lib/octokit/installation", () => ({
  getOctokitForInstallation: () => Promise.resolve({}),
}));
vi.mock("next/cache", () => ({
  unstable_cache: <A extends unknown[], T>(fn: (...args: A) => Promise<T>) => {
    const store = new Map<string, T>();
    return async (...args: A) => {
      const key = JSON.stringify(args);
      if (store.has(key)) return store.get(key);
      const value = await fn(...args);
      store.set(key, value);
      return value;
    };
  },
}));

import {
  getOwnerForks,
  getRepoCommitWeeks,
  getRepoCounters,
  getRepoForks,
} from "./repo-stats";

const db = {} as Db;

describe("getRepoForks", () => {
  it("sends the repo's daily fork counts", async () => {
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
    expect(await getRepoForks(db, 1)).toEqual([
      { date: "2026-11-01", daily: 2 },
      { date: "2026-11-03", daily: 1 },
    ]);
  });

  it("gives an empty series when there are no rows", async () => {
    getForkHistoryForRepos.mockResolvedValue(new Map());
    expect(await getRepoForks(db, 1)).toEqual([]);
  });

  it("throws when the D1 read fails", async () => {
    getForkHistoryForRepos.mockReturnValue(Promise.reject(new Error("down")));
    await expect(getRepoForks(db, 1)).rejects.toThrow("down");
  });
});

describe("getOwnerForks", () => {
  it("sends the forks summed per day", async () => {
    getDailyCountTotals.mockResolvedValue([
      { date: "2026-11-01", count: 3 },
      { date: "2026-11-02", count: 4 },
    ]);
    expect(await getOwnerForks(db, [{ id: 1 }, { id: 2 }] as Repo[])).toEqual([
      { date: "2026-11-01", daily: 3 },
      { date: "2026-11-02", daily: 4 },
    ]);
  });

  it("throws when the D1 read fails", async () => {
    getDailyCountTotals.mockReturnValue(Promise.reject(new Error("down")));
    await expect(getOwnerForks(db, [{ id: 1 }] as Repo[])).rejects.toThrow(
      "down",
    );
  });
});

describe("getRepoCounters", () => {
  it("passes rows through", async () => {
    getCounterHistory.mockResolvedValue([
      { date: "2026-11-01", stars: 1, forks: 2, watchers: 3 },
    ]);
    expect(await getRepoCounters(db, 1)).toHaveLength(1);
  });

  it("throws when D1 fails", async () => {
    getCounterHistory.mockReturnValue(Promise.reject(new Error("down")));
    await expect(getRepoCounters(db, 1)).rejects.toThrow("down");
  });
});

describe("getRepoCommitWeeks", () => {
  it("passes GitHub weeks through and caches them", async () => {
    const weeks = [{ week: "2026-11-01", commits: 1 }];
    fetchCommitWeeks.mockReset().mockResolvedValue(weeks);
    expect(await getRepoCommitWeeks(1, "o", "a")).toEqual(weeks);
    expect(await getRepoCommitWeeks(1, "o", "a")).toEqual(weeks);
    expect(fetchCommitWeeks).toHaveBeenCalledTimes(1);
  });

  it("gives null while GitHub computes and asks again next time", async () => {
    const weeks = [{ week: "2026-11-01", commits: 2 }];
    fetchCommitWeeks.mockReset().mockResolvedValueOnce(null);
    fetchCommitWeeks.mockResolvedValueOnce(weeks);
    expect(await getRepoCommitWeeks(1, "o", "b")).toBeNull();
    expect(await getRepoCommitWeeks(1, "o", "b")).toEqual(weeks);
  });

  it("throws and asks again next time when GitHub fails", async () => {
    const weeks = [{ week: "2026-11-01", commits: 3 }];
    fetchCommitWeeks.mockReset().mockRejectedValueOnce(new Error("down"));
    fetchCommitWeeks.mockResolvedValueOnce(weeks);
    await expect(getRepoCommitWeeks(1, "o", "c")).rejects.toThrow("down");
    expect(await getRepoCommitWeeks(1, "o", "c")).toEqual(weeks);
  });
});
