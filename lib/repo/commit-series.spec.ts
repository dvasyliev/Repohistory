import { describe, expect, it } from "vitest";
import { commitSeries, sumCommitHistories } from "./commit-series";

const days = [
  { date: "2025-11-20", commits: 0 },
  { date: "2026-10-25", commits: 0 },
  { date: "2026-10-26", commits: 4 },
  { date: "2026-10-27", commits: 1 },
];

describe("commitSeries", () => {
  it("uses days for a set range", () => {
    expect(commitSeries({ days, weeks: [] }, false)).toEqual(days);
  });

  it("uses days from the first commit when all time fits in the daily data", () => {
    expect(
      commitSeries({ days, weeks: [{ date: "2026-10-25", commits: 5 }] }, true),
    ).toEqual(days.slice(1));
  });

  it("uses weeks when the history is older than the daily data", () => {
    const weeks = [
      { date: "2024-01-07", commits: 3 },
      { date: "2026-10-25", commits: 5 },
    ];
    expect(commitSeries({ days, weeks }, true)).toEqual(weeks);
  });

  it("gives nothing without history", () => {
    expect(commitSeries(null, true)).toEqual([]);
  });
});

describe("sumCommitHistories", () => {
  it("adds the repos' commits per day and per week", () => {
    expect(
      sumCommitHistories([
        {
          days: [
            { date: "2026-11-01", commits: 1 },
            { date: "2026-11-02", commits: 2 },
          ],
          weeks: [{ date: "2026-10-26", commits: 3 }],
        },
        {
          days: [{ date: "2026-11-02", commits: 5 }],
          weeks: [
            { date: "2025-01-05", commits: 4 },
            { date: "2026-10-26", commits: 5 },
          ],
        },
      ]),
    ).toEqual({
      days: [
        { date: "2026-11-01", commits: 1 },
        { date: "2026-11-02", commits: 7 },
      ],
      weeks: [
        { date: "2025-01-05", commits: 4 },
        { date: "2026-10-26", commits: 8 },
      ],
    });
  });
});
