import { describe, expect, it } from "vitest";
import { cardViewsSince, summarizeCardViews } from "./card-views";

const now = new Date("2026-11-18T12:00:00Z");

describe("cardViewsSince", () => {
  it("starts the card window 14 days before today", () => {
    expect(cardViewsSince(now)).toBe("2026-11-04");
  });
});

describe("summarizeCardViews", () => {
  it("fills the last 14 days before today and sums the series per day", () => {
    const result = summarizeCardViews(
      [
        [
          { date: "2026-11-04", total: 2 },
          { date: "2026-11-17", total: 3 },
          { date: "2026-11-18", total: 50 },
        ],
        [
          { date: "2026-11-11", total: 1 },
          { date: "2026-11-17", total: 4 },
        ],
      ],
      now,
    );

    expect(result.last7Days).toEqual([
      { date: "2026-11-11", total: 1 },
      { date: "2026-11-12", total: 0 },
      { date: "2026-11-13", total: 0 },
      { date: "2026-11-14", total: 0 },
      { date: "2026-11-15", total: 0 },
      { date: "2026-11-16", total: 0 },
      { date: "2026-11-17", total: 7 },
    ]);
    expect(result.totalViews).toBe(8);
    expect(result.trend).toMatchObject({
      current: 8,
      previous: 2,
      isIncrease: true,
    });
  });

  it("gives zero views and a flat trend without any rows", () => {
    const result = summarizeCardViews([], now);
    expect(result.last7Days).toHaveLength(7);
    expect(result.totalViews).toBe(0);
  });
});
