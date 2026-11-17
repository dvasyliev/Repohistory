import { drizzle } from "drizzle-orm/sqlite-proxy";
import { describe, expect, it } from "vitest";
import * as schema from "./db/schema";
import {
  toDailyRows,
  toPathRows,
  toReferrerRows,
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
});
