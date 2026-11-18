import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "@/lib/db/client";

const getDailyHistory = vi.hoisted(() => vi.fn());
const getViews = vi.hoisted(() => vi.fn());
vi.mock("@/lib/db/traffic", () => ({ getDailyHistory }));
vi.mock("@/lib/octokit/installation", () => ({
  getOctokitForInstallation: () =>
    Promise.resolve({ rest: { repos: { getViews } } }),
}));
vi.mock("next/cache", () => ({
  unstable_cache: <T>(fn: () => Promise<T>) => fn,
}));

import { getRepoViews } from "./views";

const db = {} as Db;

function githubViews(
  views: Array<{ timestamp: string; count: number; uniques: number }>,
) {
  getViews.mockResolvedValue({ data: { views } });
  return 1;
}

function daysAgo(n: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().split("T")[0];
}

describe("getRepoViews", () => {
  beforeEach(() => {
    getDailyHistory.mockReset();
  });

  it("includes stored days older than GitHub's window", async () => {
    const old = daysAgo(40);
    getDailyHistory.mockResolvedValue([{ date: old, total: 7, unique: 3 }]);
    const result = await getRepoViews(githubViews([]), db, "o/r", 1);
    expect(result.views[0]).toEqual({ timestamp: old, count: 7, uniques: 3 });
    expect(getDailyHistory).toHaveBeenCalledWith(db, "views", 1);
  });

  it("prefers GitHub's numbers on a day present in both sources", async () => {
    const day = daysAgo(2);
    getDailyHistory.mockResolvedValue([{ date: day, total: 1, unique: 1 }]);
    const installationId = githubViews([
      { timestamp: `${day}T00:00:00Z`, count: 9, uniques: 4 },
    ]);
    const result = await getRepoViews(installationId, db, "o/r", 1);
    expect(result.views).toContainEqual({
      timestamp: day,
      count: 9,
      uniques: 4,
    });
  });

  it("throws when GitHub fails", async () => {
    getDailyHistory.mockResolvedValue([]);
    getViews.mockRejectedValue(new Error("github down"));
    await expect(getRepoViews(1, db, "o/r", 1)).rejects.toThrow("github down");
  });

  it("throws when D1 fails", async () => {
    getDailyHistory.mockRejectedValue(new Error("d1 down"));
    await expect(getRepoViews(githubViews([]), db, "o/r", 1)).rejects.toThrow(
      "d1 down",
    );
  });

  it("skips GitHub without an installation", async () => {
    getViews.mockReset();
    expect(
      await getRepoViews(null, db, "", 0, [
        { date: daysAgo(1), total: 2, unique: 1 },
      ]),
    ).toMatchObject({ count: 2, uniques: 1 });
    expect(getViews).not.toHaveBeenCalled();
  });

  it("returns empty views when there is no history and no traffic", async () => {
    getDailyHistory.mockResolvedValue([]);
    expect(await getRepoViews(githubViews([]), db, "o/r", 1)).toEqual({
      count: 0,
      uniques: 0,
      views: [],
    });
  });
});
