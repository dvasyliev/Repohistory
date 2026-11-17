import { describe, expect, it } from "vitest";
import { toDailyRows, toPathRows, toReferrerRows } from "./traffic-rows";

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
