import { describe, expect, it } from "vitest";
import { changeInRange, sumInRange } from "./metric-summary";

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
    expect(summary?.trend?.isIncrease).toBe(true);
    expect(summary?.trend?.percentage).toBeCloseTo(133.3, 1);
  });

  it("compares daily averages with the part of the previous period it has", () => {
    const summary = sumInRange(series.slice(1), {
      from: new Date("2026-11-03"),
      to: new Date("2026-11-04"),
    });
    expect(summary?.trend?.isIncrease).toBe(true);
    expect(summary?.trend?.percentage).toBeCloseTo(75, 1);
  });

  it("leaves today out of the trend", () => {
    const summary = sumInRange(
      series,
      { from: new Date("2026-11-03"), to: new Date("2026-11-04T12:00:00Z") },
      "2026-11-04",
    );
    expect(summary?.value).toBe(7);
    expect(summary?.trend?.percentage).toBeCloseTo(50, 1);
  });

  it("has no trend without data before the range", () => {
    expect(
      sumInRange(series.slice(2), {
        from: new Date("2026-11-03"),
        to: new Date("2026-11-04"),
      })?.trend,
    ).toBeNull();
  });

  it("counts days missing from the series as zero", () => {
    const summary = sumInRange(
      [
        { date: "2026-11-01", value: 4 },
        { date: "2026-11-04", value: 2 },
      ],
      { from: new Date("2026-11-03"), to: new Date("2026-11-04") },
    );
    expect(summary?.trend?.isIncrease).toBe(false);
    expect(summary?.trend?.percentage).toBeCloseTo(50, 1);
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

describe("changeInRange", () => {
  const watchers = [
    { date: "2026-11-01", value: 4 },
    { date: "2026-11-03", value: 5 },
  ];

  it("gives the latest value and its change since the range began", () => {
    const summary = changeInRange(watchers, {
      from: new Date("2026-11-02"),
      to: new Date("2026-11-04"),
    });
    expect(summary?.value).toBe(5);
    expect(summary?.trend?.isIncrease).toBe(true);
    expect(summary?.trend?.percentage).toBeCloseTo(25, 1);
  });

  it("has no trend without a value before the range", () => {
    expect(
      changeInRange(watchers, {
        from: new Date("2026-10-01"),
        to: new Date("2026-11-04"),
      })?.trend,
    ).toBeNull();
  });

  it("returns null for an empty series", () => {
    expect(changeInRange([], { from: null, to: null })).toBeNull();
  });
});
