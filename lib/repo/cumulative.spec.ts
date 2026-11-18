import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toCumulativeDays } from "./cumulative";

describe("toCumulativeDays", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-05T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts the day before the first entry and fills every day to today", () => {
    expect(
      toCumulativeDays([
        { date: "2026-11-04", daily: 1 },
        { date: "2026-11-02", daily: 2 },
      ]),
    ).toEqual([
      { date: "2026-11-01", daily: 0, cumulative: 0 },
      { date: "2026-11-02", daily: 2, cumulative: 2 },
      { date: "2026-11-03", daily: 0, cumulative: 2 },
      { date: "2026-11-04", daily: 1, cumulative: 3 },
      { date: "2026-11-05", daily: 0, cumulative: 3 },
    ]);
  });

  it("gives an empty series for no entries", () => {
    expect(toCumulativeDays([])).toEqual([]);
  });
});
