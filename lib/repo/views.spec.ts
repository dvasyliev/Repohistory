import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Octokit } from "octokit";
import type { Db } from "@/lib/db/client";

const getDailyHistory = vi.hoisted(() => vi.fn());
vi.mock("@/lib/db/traffic", () => ({ getDailyHistory }));

import { getRepoViews } from "./views";

const db = {} as Db;

function fakeOctokit(
  views: Array<{ timestamp: string; count: number; uniques: number }>,
) {
  return {
    rest: {
      repos: { getViews: vi.fn().mockResolvedValue({ data: { views } }) },
    },
  } as unknown as Octokit;
}

function daysAgo(n: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().split("T")[0];
}

describe("getRepoViews", () => {
  beforeEach(() => getDailyHistory.mockReset());

  it("includes stored days older than GitHub's window", async () => {
    const old = daysAgo(40);
    getDailyHistory.mockResolvedValue([{ date: old, total: 7, unique: 3 }]);
    const result = await getRepoViews(fakeOctokit([]), db, "o/r", 1);
    expect(result.views[0]).toEqual({ timestamp: old, count: 7, uniques: 3 });
    expect(getDailyHistory).toHaveBeenCalledWith(db, "views", 1);
  });

  it("prefers GitHub's numbers on a day present in both sources", async () => {
    const day = daysAgo(2);
    getDailyHistory.mockResolvedValue([{ date: day, total: 1, unique: 1 }]);
    const octokit = fakeOctokit([
      { timestamp: `${day}T00:00:00Z`, count: 9, uniques: 4 },
    ]);
    const result = await getRepoViews(octokit, db, "o/r", 1);
    expect(result.views).toContainEqual({
      timestamp: day,
      count: 9,
      uniques: 4,
    });
  });

  it("returns empty views when there is no history and no traffic", async () => {
    getDailyHistory.mockResolvedValue([]);
    expect(await getRepoViews(fakeOctokit([]), db, "o/r", 1)).toEqual({
      count: 0,
      uniques: 0,
      views: [],
    });
  });
});
