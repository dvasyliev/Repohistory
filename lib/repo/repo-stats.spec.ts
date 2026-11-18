import { describe, expect, it, vi } from "vitest";
import type { Db } from "@/lib/db/client";
import type { Repo } from "@/lib/types";

const getForkHistoryForRepos = vi.hoisted(() => vi.fn());
const getCounterHistory = vi.hoisted(() => vi.fn());
const getCommitWeeks = vi.hoisted(() => vi.fn());
vi.mock("@/lib/db/traffic", () => ({
  getForkHistoryForRepos,
  getCounterHistory,
  getCommitWeeks,
}));
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
  it("sums the repos' forks per day", async () => {
    getForkHistoryForRepos.mockResolvedValue(
      new Map([
        [1, [{ date: "2026-11-01", count: 2 }]],
        [
          2,
          [
            { date: "2026-11-01", count: 1 },
            { date: "2026-11-02", count: 4 },
          ],
        ],
      ]),
    );
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
    getForkHistoryForRepos.mockReturnValue(Promise.reject(new Error("down")));
    expect(await getOwnerForks(db, [{ id: 1 }] as Repo[])).toEqual([]);
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });
});

describe("getRepoCounters and getRepoCommitWeeks", () => {
  it("pass rows through", async () => {
    getCounterHistory.mockResolvedValue([
      { date: "2026-11-01", stars: 1, forks: 2, watchers: 3, openIssues: 4 },
    ]);
    getCommitWeeks.mockResolvedValue([
      { week: "2026-11-01", commits: 1, additions: 2, deletions: 3 },
    ]);
    expect(await getRepoCounters(db, 1)).toHaveLength(1);
    expect(await getRepoCommitWeeks(db, 1)).toHaveLength(1);
  });

  it("give empty lists and log when D1 fails", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    getCounterHistory.mockReturnValue(Promise.reject(new Error("down")));
    getCommitWeeks.mockReturnValue(Promise.reject(new Error("down")));
    expect(await getRepoCounters(db, 1)).toEqual([]);
    expect(await getRepoCommitWeeks(db, 1)).toEqual([]);
    expect(error).toHaveBeenCalledTimes(2);
    error.mockRestore();
  });
});
