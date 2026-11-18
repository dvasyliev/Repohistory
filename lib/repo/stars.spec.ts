import { describe, expect, it, vi } from "vitest";
import type { Octokit } from "octokit";
import type { Db } from "@/lib/db/client";

const getStarHistory = vi.hoisted(() => vi.fn());
vi.mock("@/lib/db/traffic", () => ({ getStarHistory }));

vi.mock("next/cache", () => ({
  unstable_cache: <T>(fn: () => Promise<T>) => fn,
}));

import { getRepoStars, getRepoStarsChart, toDailyStars } from "./stars";

const db = {} as Db;
const SUNDAY_2026_11_01 = Date.UTC(2026, 10, 1) / 1000;
const SUNDAY_2026_11_08 = Date.UTC(2026, 10, 8) / 1000;

function fakeOctokit(pages: Array<Array<{ week: number; days: number[] }>>) {
  const request = vi.fn((_route: string, params: { page: number }) =>
    Promise.resolve({
      data: (pages[params.page - 1] ?? []).map((w) => ({
        ...w,
        total: w.days.reduce((a, b) => a + b, 0),
      })),
    }),
  );
  return { octokit: { request } as unknown as Octokit, request };
}

describe("toDailyStars", () => {
  it("spreads each week's days from its Sunday", () => {
    expect(
      toDailyStars([{ week: SUNDAY_2026_11_01, days: [1, 0, 2, 0, 0, 0, 3] }]),
    ).toEqual({ "2026-11-01": 1, "2026-11-03": 2, "2026-11-07": 3 });
  });
});

describe("getRepoStars", () => {
  const repo = { id: 1, fullName: "a/b", stargazersCount: 3 };

  it("builds a cumulative daily series from the first stored day", async () => {
    const result = await getRepoStars(db, repo, [
      { date: "2026-11-03", count: 2 },
      { date: "2026-11-09", count: 1 },
    ]);

    expect(result.totalStars).toBe(3);
    expect(result.hasEstimatedData).toBe(false);
    expect(result.starsHistory[0]).toMatchObject({
      date: "2026-11-02",
      cumulative: 0,
    });
    expect(
      result.starsHistory.find((d) => d.date === "2026-11-03"),
    ).toMatchObject({ daily: 2, cumulative: 2 });
    expect(
      result.starsHistory.find((d) => d.date === "2026-11-09"),
    ).toMatchObject({ daily: 1, cumulative: 3 });
  });

  it("reads the repo's rows when none are passed", async () => {
    getStarHistory.mockResolvedValue([{ date: "2026-11-03", count: 2 }]);
    const result = await getRepoStars(db, repo);
    expect(getStarHistory).toHaveBeenCalledWith(db, 1);
    expect(result.starsHistory.length).toBeGreaterThan(0);
  });

  it("gives the live total and no chart when D1 has no rows", async () => {
    getStarHistory.mockResolvedValue([]);
    const result = await getRepoStars(db, { ...repo, stargazersCount: 5 });
    expect(result).toMatchObject({ totalStars: 5, starsHistory: [] });
  });

  it("throws when the D1 read fails", async () => {
    getStarHistory.mockReturnValue(Promise.reject(new Error("d1 down")));
    await expect(getRepoStars(db, repo)).rejects.toThrow("d1 down");
  });
});

describe("getRepoStarsChart", () => {
  it("gives one cumulative point per week, oldest first", async () => {
    const { octokit } = fakeOctokit([
      [
        { week: SUNDAY_2026_11_08, days: [0, 1, 0, 0, 0, 0, 0] },
        { week: SUNDAY_2026_11_01, days: [0, 0, 2, 0, 0, 0, 0] },
      ],
    ]);

    const result = await getRepoStarsChart(octokit, {
      fullName: "a/b",
      stargazersCount: 3,
    });

    expect(result.starsHistory.map((p) => [p.date, p.cumulative])).toEqual([
      ["2026-11-01", 2],
      ["2026-11-08", 3],
    ]);
  });
});
