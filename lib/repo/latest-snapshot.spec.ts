import { describe, expect, it } from "vitest";
import { latestSnapshot } from "./latest-snapshot";

const point = (timestamp: string, count: number, uniques: number | null) => ({
  timestamp,
  count,
  uniques,
});

describe("latestSnapshot", () => {
  it("keeps only the newest day, sorted by count", () => {
    expect(
      latestSnapshot([
        {
          label: "google.com",
          data: [point("2026-11-17", 9, 4), point("2026-11-18", 5, 3)],
        },
        { label: "github.com", data: [point("2026-11-18", 9, 5)] },
        { label: "old.com", data: [point("2026-11-17", 50, 1)] },
      ]),
    ).toEqual({
      date: "2026-11-18",
      items: [
        { label: "github.com", count: 9, uniques: 5 },
        { label: "google.com", count: 5, uniques: 3 },
      ],
    });
  });

  it("drops zero counts and keeps at most 10", () => {
    const items = Array.from({ length: 12 }, (_, i) => ({
      label: `site${i}`,
      data: [point("2026-11-18", i, null)],
    }));
    const snapshot = latestSnapshot(items);
    expect(snapshot.items).toHaveLength(10);
    expect(snapshot.items[0]).toEqual({
      label: "site11",
      count: 11,
      uniques: null,
    });
    expect(snapshot.items.some((item) => item.count === 0)).toBe(false);
  });

  it("returns no date for no data", () => {
    expect(latestSnapshot([])).toEqual({ date: null, items: [] });
  });
});
