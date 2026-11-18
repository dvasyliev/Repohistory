import { describe, expect, it } from "vitest";
import { latestValue, sumInRange } from "./metric-summary";

const series = [
  { date: "2026-11-01", value: 1 },
  { date: "2026-11-02", value: 2 },
  { date: "2026-11-03", value: 3 },
  { date: "2026-11-04", value: 4 },
];

describe("sumInRange", () => {
  it("sums the range and compares it with the previous period", () => {
    const summary = sumInRange(series, {
      from: new Date("2026-11-03"),
      to: new Date("2026-11-04"),
    });
    expect(summary?.value).toBe(7);
    expect(summary?.trend?.previous).toBe(3);
    expect(summary?.trend?.isIncrease).toBe(true);
  });

  it("returns null for an empty series", () => {
    expect(sumInRange([], { from: null, to: null })).toBeNull();
  });

  it("sums everything with no trend when the range is open", () => {
    expect(sumInRange(series, { from: null, to: null })).toEqual({
      value: 10,
      trend: null,
    });
  });
});

describe("latestValue", () => {
  it("returns null for an empty series", () => {
    expect(latestValue([])).toBeNull();
  });

  it("returns the last value", () => {
    expect(
      latestValue([
        { date: "2026-11-01", value: 3 },
        { date: "2026-11-02", value: 5 },
      ]),
    ).toBe(5);
  });
});
