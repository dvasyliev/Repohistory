import { describe, expect, it } from "vitest";
import { emptyChartMessage, hasNonZero } from "./chart-empty";

describe("hasNonZero", () => {
  it("is false for no rows", () => {
    expect(hasNonZero([], ["count"])).toBe(false);
  });

  it("is false when every value of the keys is 0", () => {
    const rows = [
      { date: "2026-11-01", count: 0, other: 5 },
      { date: "2026-11-02", count: 0, other: 3 },
    ];
    expect(hasNonZero(rows, ["count"])).toBe(false);
  });

  it("is true when one value of the keys is above 0", () => {
    const rows = [
      { date: "2026-11-01", a: 0, b: 0 },
      { date: "2026-11-02", a: 0, b: 1 },
    ];
    expect(hasNonZero(rows, ["a", "b"])).toBe(true);
  });

  it("ignores missing values", () => {
    const rows: Array<{ date: string; a?: number }> = [{ date: "2026-11-01" }];
    expect(hasNonZero(rows, ["a"])).toBe(false);
  });
});

describe("emptyChartMessage", () => {
  it("says yet when there is no data at all", () => {
    expect(emptyChartMessage("views", false, "28")).toBe("No views yet");
  });

  it("names the range when data exists outside it", () => {
    expect(emptyChartMessage("views", true, "28")).toBe(
      "No views in the last 28 days",
    );
  });

  it("says yet for the all-time period", () => {
    expect(emptyChartMessage("stars", true, "all")).toBe("No stars yet");
  });
});
