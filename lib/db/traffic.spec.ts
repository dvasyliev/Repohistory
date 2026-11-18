import { describe, expect, it, vi } from "vitest";
import type { Db } from "./client";
import { paths, referrers, repoCounters, stars, views } from "./schema";
import { createTestDb } from "./test-db";
import {
  getCounterTotals,
  getDailyCountTotals,
  getDailyHistoryForRepos,
  getDailyTotals,
  getRecentViewsForRepos,
  getReferrerTotals,
  getTopPathHistory,
} from "./traffic";

function fakeDb(onWhere: (params: unknown) => void) {
  const chain = {
    from: () => chain,
    where: (condition: unknown) => {
      onWhere(condition);
      return chain;
    },
    orderBy: () => Promise.resolve([]),
  };
  return { select: () => chain } as unknown as Db;
}

describe("getDailyHistoryForRepos", () => {
  it("splits more than 90 repo ids into several queries", async () => {
    const where = vi.fn();
    const ids = Array.from({ length: 200 }, (_, i) => i + 1);
    await getDailyHistoryForRepos(fakeDb(where), "views", ids);
    expect(where).toHaveBeenCalledTimes(3);
  });

  it("does not query without repo ids", async () => {
    const where = vi.fn();
    await getDailyHistoryForRepos(fakeDb(where), "views", []);
    expect(where).not.toHaveBeenCalled();
  });
});

async function seededDb() {
  const db = createTestDb();
  await db.insert(views).values([
    { repoId: 1, date: "2026-11-02", total: 5, unique: 2 },
    { repoId: 1, date: "2026-11-01", total: 3, unique: 1 },
    { repoId: 2, date: "2026-11-01", total: 4, unique: 4 },
    { repoId: 2, date: "2026-10-20", total: 9, unique: 9 },
    { repoId: 3, date: "2026-11-01", total: 100, unique: 100 },
  ]);
  await db.insert(stars).values([
    { repoId: 1, date: "2026-11-01", count: 2 },
    { repoId: 2, date: "2026-11-01", count: 1 },
    { repoId: 2, date: "2026-11-03", count: 6 },
  ]);
  await db.insert(referrers).values([
    { repoId: 1, referrer: "google", date: "2026-11-01", total: 3, unique: 2 },
    {
      repoId: 2,
      referrer: "google",
      date: "2026-11-01",
      total: 4,
      unique: null,
    },
    { repoId: 2, referrer: "bing", date: "2026-11-01", total: 1, unique: null },
  ]);
  await db.insert(paths).values([
    { repoId: 1, path: "/a", date: "2026-11-01", total: 10, unique: 1 },
    { repoId: 1, path: "/a", date: "2026-11-02", total: 10, unique: 1 },
    { repoId: 1, path: "/b", date: "2026-11-01", total: 1, unique: 1 },
    { repoId: 2, path: "/", date: "2026-11-01", total: 5, unique: null },
  ]);
  return db;
}

describe("getRecentViewsForRepos", () => {
  it("gives each repo its days since the start date, in date order", async () => {
    const db = await seededDb();
    const byRepo = await getRecentViewsForRepos(db, [1, 2], "2026-11-01");
    expect(byRepo.get(1)).toEqual([
      { date: "2026-11-01", total: 3, unique: 1 },
      { date: "2026-11-02", total: 5, unique: 2 },
    ]);
    expect(byRepo.get(2)).toEqual([
      { date: "2026-11-01", total: 4, unique: 4 },
    ]);
    expect(byRepo.has(3)).toBe(false);
  });
});

describe("getDailyTotals", () => {
  it("sums the repos' views per day", async () => {
    const db = await seededDb();
    expect(await getDailyTotals(db, "views", [1, 2])).toEqual([
      { date: "2026-10-20", total: 9, unique: 9 },
      { date: "2026-11-01", total: 7, unique: 5 },
      { date: "2026-11-02", total: 5, unique: 2 },
    ]);
  });

  it("adds up days that fall in different chunks of repo ids", async () => {
    const db = await seededDb();
    const ids = [1, ...Array.from({ length: 100 }, (_, i) => i + 10), 2];
    const totals = await getDailyTotals(db, "views", ids);
    expect(totals.find((d) => d.date === "2026-11-01")).toEqual({
      date: "2026-11-01",
      total: 7,
      unique: 5,
    });
  });

  it("does not query without repo ids", async () => {
    expect(await getDailyTotals(createTestDb(), "views", [])).toEqual([]);
  });
});

describe("getDailyCountTotals", () => {
  it("sums the repos' stars per day", async () => {
    const db = await seededDb();
    expect(await getDailyCountTotals(db, "stars", [1, 2])).toEqual([
      { date: "2026-11-01", count: 3 },
      { date: "2026-11-03", count: 6 },
    ]);
  });
});

describe("getCounterTotals", () => {
  it("sums the repos' counters per day", async () => {
    const db = createTestDb();
    await db.insert(repoCounters).values([
      { repoId: 1, date: "2026-11-02", stars: 1, forks: 2, watchers: 3 },
      { repoId: 2, date: "2026-11-02", stars: 4, forks: 5, watchers: 6 },
      { repoId: 2, date: "2026-11-01", stars: 1, forks: 1, watchers: 1 },
      { repoId: 3, date: "2026-11-02", stars: 9, forks: 9, watchers: 9 },
    ]);
    expect(await getCounterTotals(db, [1, 2])).toEqual([
      { date: "2026-11-01", stars: 1, forks: 1, watchers: 1 },
      { date: "2026-11-02", stars: 5, forks: 7, watchers: 9 },
    ]);
  });
});

describe("getReferrerTotals", () => {
  it("sums each referrer per day and keeps unknown uniques out of the sum", async () => {
    const db = await seededDb();
    const totals = await getReferrerTotals(db, [1, 2]);
    expect(totals).toHaveLength(2);
    expect(totals).toContainEqual({
      date: "2026-11-01",
      referrer: "google",
      total: 7,
      unique: 2,
    });
    expect(totals).toContainEqual({
      date: "2026-11-01",
      referrer: "bing",
      total: 1,
      unique: null,
    });
  });
});

describe("getTopPathHistory", () => {
  it("gives every day of the paths with the most views", async () => {
    const db = await seededDb();
    const rows = await getTopPathHistory(db, [1, 2], 2);
    expect(rows).toEqual([
      { repoId: 1, path: "/a", date: "2026-11-01", total: 10, unique: 1 },
      { repoId: 2, path: "/", date: "2026-11-01", total: 5, unique: null },
      { repoId: 1, path: "/a", date: "2026-11-02", total: 10, unique: 1 },
    ]);
  });
});
