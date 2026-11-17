import { describe, expect, it, vi } from "vitest";
import type { Octokit } from "octokit";

vi.mock("next/cache", () => ({
  unstable_cache: <T>(fn: () => Promise<T>) => fn,
}));

import { getRepoStars, getRepoStarsChart, toDailyStars } from "./stars";

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
  it("builds a cumulative daily series from the first star", async () => {
    const { octokit } = fakeOctokit([
      [
        { week: SUNDAY_2026_11_08, days: [0, 1, 0, 0, 0, 0, 0] },
        { week: SUNDAY_2026_11_01, days: [0, 0, 2, 0, 0, 0, 0] },
      ],
    ]);

    const result = await getRepoStars(octokit, {
      fullName: "dvasyliev/react-crash-course",
      stargazersCount: 3,
    });

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

  it("reads pages until one comes back short", async () => {
    const fullPage = Array.from({ length: 30 }, (_, i) => ({
      week: SUNDAY_2026_11_08 - i * 7 * 86400,
      days: [0, 0, 0, 0, 0, 0, 0],
    }));
    const { octokit, request } = fakeOctokit([fullPage, []]);

    await getRepoStars(octokit, { fullName: "a/b", stargazersCount: 0 });

    expect(request).toHaveBeenCalledTimes(2);
  });

  it("returns an empty history for a repo without stars", async () => {
    const { octokit } = fakeOctokit([[]]);

    const result = await getRepoStars(octokit, {
      fullName: "a/b",
      stargazersCount: 0,
    });

    expect(result.starsHistory).toEqual([]);
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
