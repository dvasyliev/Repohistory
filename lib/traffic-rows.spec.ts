import { drizzle } from "drizzle-orm/sqlite-proxy";
import { describe, expect, it } from "vitest";
import * as schema from "./db/schema";
import {
  toDailyRows,
  toPathRows,
  toCodeFrequencyRows,
  toCommitActivityRows,
  toForkRows,
  toReferrerRows,
  toStarRows,
  upsertTraffic,
  type DailyRow,
} from "./traffic-rows";

describe("toDailyRows", () => {
  it("keeps only the date of the timestamp", () => {
    expect(
      toDailyRows(7, [
        { timestamp: "2025-06-22T00:00:00Z", count: 5, uniques: 2 },
      ]),
    ).toEqual([{ repoId: 7, date: "2025-06-22", total: 5, unique: 2 }]);
  });
});

describe("toPathRows", () => {
  const date = "2025-06-23";

  it("strips the owner and repo prefix", () => {
    const rows = toPathRows(
      7,
      [
        {
          path: "/dvasyliev/react-crash-course/tree/main",
          count: 4,
          uniques: 3,
        },
        { path: "/dvasyliev/react-crash-course", count: 9, uniques: 6 },
      ],
      date,
    );
    expect(rows).toEqual([
      { repoId: 7, path: "/tree/main", date, total: 4, unique: 3 },
      { repoId: 7, path: "/", date, total: 9, unique: 6 },
    ]);
  });

  it("sums items that strip to the same path", () => {
    const rows = toPathRows(
      7,
      [
        { path: "/a/b/issues", count: 2, uniques: 1 },
        { path: "/c/d/issues", count: 3, uniques: 2 },
      ],
      date,
    );
    expect(rows).toEqual([
      { repoId: 7, path: "/issues", date, total: 5, unique: 3 },
    ]);
  });
});

describe("toReferrerRows", () => {
  it("carries the date", () => {
    expect(
      toReferrerRows(
        7,
        [{ referrer: "Google", count: 8, uniques: 4 }],
        "2025-06-23",
      ),
    ).toEqual([
      {
        repoId: 7,
        referrer: "Google",
        date: "2025-06-23",
        total: 8,
        unique: 4,
      },
    ]);
  });
});

describe("toStarRows", () => {
  it("makes one row per day with stars", () => {
    expect(
      toStarRows(1, [
        { week: Date.UTC(2026, 10, 1) / 1000, days: [1, 0, 2, 0, 0, 0, 3] },
      ]),
    ).toEqual([
      { repoId: 1, date: "2026-11-01", count: 1 },
      { repoId: 1, date: "2026-11-03", count: 2 },
      { repoId: 1, date: "2026-11-07", count: 3 },
    ]);
  });
});

describe("toForkRows", () => {
  it("counts forks per creation day", () => {
    expect(
      toForkRows(1, [
        "2026-11-01T10:00:00Z",
        "2026-11-01T23:00:00Z",
        "2026-11-03T01:00:00Z",
      ]),
    ).toEqual([
      { repoId: 1, date: "2026-11-01", count: 2 },
      { repoId: 1, date: "2026-11-03", count: 1 },
    ]);
  });
});

describe("commit week rows", () => {
  const week = Date.UTC(2026, 10, 1) / 1000;

  it("maps commit activity with zero line counts", () => {
    expect(toCommitActivityRows(1, [{ week, total: 5 }])).toEqual([
      { repoId: 1, week: "2026-11-01", commits: 5, additions: 0, deletions: 0 },
    ]);
  });

  it("maps code frequency with positive deletions and zero commits", () => {
    expect(toCodeFrequencyRows(1, [[week, 120, -30]])).toEqual([
      {
        repoId: 1,
        week: "2026-11-01",
        commits: 0,
        additions: 120,
        deletions: 30,
      },
    ]);
  });
});

describe("upsertTraffic", () => {
  function recordingDb() {
    const batches: { sql: string; params: unknown[] }[][] = [];
    const db = drizzle(
      () => Promise.resolve({ rows: [] }),
      (queries) => {
        batches.push(queries.map(({ sql, params }) => ({ sql, params })));
        return Promise.resolve(queries.map(() => ({ rows: [] })));
      },
      { schema },
    );
    return { db, batches };
  }

  const daily = (n: number): DailyRow[] =>
    Array.from({ length: n }, (_, i) => ({
      repoId: 1,
      date: `2025-01-${String(i).padStart(3, "0")}`,
      total: i,
      unique: i,
    }));

  it("splits 45 rows into 3 statements of at most 20 rows", async () => {
    const { db, batches } = recordingDb();
    await upsertTraffic(db, {
      views: daily(45),
      clones: [],
      paths: [],
      referrers: [],
    });
    expect(batches).toHaveLength(1);
    expect(batches[0].map((s) => s.params.length / 4)).toEqual([20, 20, 5]);
  });

  it("sends at most 500 rows per batch call", async () => {
    const { db, batches } = recordingDb();
    await upsertTraffic(db, {
      views: daily(1020),
      clones: [],
      paths: [],
      referrers: [],
    });
    expect(batches.map((b) => b.length)).toEqual([25, 25, 1]);
  });

  it("sends nothing for empty input", async () => {
    const { db, batches } = recordingDb();
    await upsertTraffic(db, {
      views: [],
      clones: [],
      paths: [],
      referrers: [],
    });
    expect(batches).toHaveLength(0);
  });

  it("splits 45 star rows into 3 statements of at most 20 rows", async () => {
    const { db, batches } = recordingDb();
    await upsertTraffic(db, {
      views: [],
      clones: [],
      paths: [],
      referrers: [],
      stars: {
        repoId: 1,
        rows: Array.from({ length: 45 }, (_, i) => ({
          repoId: 1,
          date: `2025-01-${String(i).padStart(3, "0")}`,
          count: i + 1,
        })),
      },
    });
    expect(batches[0].slice(1).map((s) => s.params.length / 3)).toEqual([
      20, 20, 5,
    ]);
    expect(batches[0][1].sql).toContain("on conflict");
    expect(batches[0][1].sql).toContain('"stars"');
  });

  it("deletes the repo's stars before inserting the new ones", async () => {
    const { db, batches } = recordingDb();
    await upsertTraffic(db, {
      views: daily(1),
      clones: [],
      paths: [],
      referrers: [],
      stars: { repoId: 9, rows: [{ repoId: 9, date: "2025-01-01", count: 2 }] },
    });
    const sqls = batches[0].map((s) => s.sql);
    expect(sqls[0]).toMatch(/^delete from "stars" where/);
    expect(sqls[0]).toContain('"repo_id" = ?');
    expect(batches[0][0].params).toEqual([9]);
    expect(sqls[1]).toContain('insert into "views"');
    expect(sqls[2]).toContain('insert into "stars"');
  });

  it("only deletes when a successful fetch found no stars", async () => {
    const { db, batches } = recordingDb();
    await upsertTraffic(db, {
      views: [],
      clones: [],
      paths: [],
      referrers: [],
      stars: { repoId: 9, rows: [] },
    });
    expect(batches[0]).toHaveLength(1);
    expect(batches[0][0].sql).toMatch(/^delete from "stars"/);
  });

  it("keeps stored stars when no star replacement is given", async () => {
    const { db, batches } = recordingDb();
    await upsertTraffic(db, {
      views: daily(1),
      clones: [],
      paths: [],
      referrers: [],
    });
    expect(batches[0].map((s) => s.sql).join()).not.toContain("stars");
  });

  it("deletes the repo's forks before inserting, then chunks by 20", async () => {
    const { db, batches } = recordingDb();
    await upsertTraffic(db, {
      views: [],
      clones: [],
      paths: [],
      referrers: [],
      forks: {
        repoId: 4,
        rows: Array.from({ length: 25 }, (_, i) => ({
          repoId: 4,
          date: `2025-01-${String(i).padStart(3, "0")}`,
          count: 1,
        })),
      },
    });
    expect(batches[0][0].sql).toMatch(/^delete from "forks" where/);
    expect(batches[0][0].params).toEqual([4]);
    expect(batches[0].slice(1).map((s) => s.params.length / 3)).toEqual([
      20, 5,
    ]);
  });

  it("upserts commit weeks by column without deleting", async () => {
    const { db, batches } = recordingDb();
    const row = (i: number) => ({
      repoId: 4,
      week: `2025-01-${String(i).padStart(3, "0")}`,
      commits: i,
      additions: 1,
      deletions: 1,
    });
    await upsertTraffic(db, {
      views: [],
      clones: [],
      paths: [],
      referrers: [],
      commitWeeks: {
        activity: Array.from({ length: 21 }, (_, i) => row(i)),
        frequency: [row(1)],
      },
    });
    const statements = batches[0];
    expect(statements.some((s) => s.sql.startsWith("delete"))).toBe(false);
    expect(statements.map((s) => s.params.length / 5)).toEqual([20, 1, 1]);
    expect(statements.every((s) => s.params.length <= 100)).toBe(true);
    const update = (sql: string) => sql.slice(sql.indexOf("do update set"));
    for (const s of statements.slice(0, 2)) {
      expect(update(s.sql)).toContain('"commits" = excluded.commits');
      expect(update(s.sql)).not.toContain("additions");
      expect(update(s.sql)).not.toContain("deletions");
    }
    expect(update(statements[2].sql)).toContain(
      '"additions" = excluded.additions',
    );
    expect(update(statements[2].sql)).toContain(
      '"deletions" = excluded.deletions',
    );
    expect(update(statements[2].sql)).not.toContain("commits");
  });

  it("upserts counters in chunks of 16 rows", async () => {
    const { db, batches } = recordingDb();
    await upsertTraffic(db, {
      views: [],
      clones: [],
      paths: [],
      referrers: [],
      counters: Array.from({ length: 17 }, (_, i) => ({
        repoId: i,
        date: "2026-11-18",
        stars: 1,
        forks: 1,
        watchers: 1,
        openIssues: 1,
      })),
    });
    expect(batches[0].map((s) => s.params.length / 6)).toEqual([16, 1]);
    expect(batches[0][0].sql).toContain("on conflict");
    expect(batches[0].every((s) => s.params.length <= 100)).toBe(true);
  });

  it("keeps stored forks and commit weeks when none are given", async () => {
    const { db, batches } = recordingDb();
    await upsertTraffic(db, {
      views: daily(1),
      clones: [],
      paths: [],
      referrers: [],
    });
    const sql = batches[0].map((s) => s.sql).join();
    expect(sql).not.toContain("forks");
    expect(sql).not.toContain("commit_weeks");
  });
});
