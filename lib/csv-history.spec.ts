import { describe, expect, it } from "vitest";
import { parseDailyCsv, parseWideCsv } from "./csv-history";

describe("parseDailyCsv", () => {
  it("turns each row into numbers", () => {
    const text =
      "Date,Total Views,Unique Views\n2025-07-05,12,3\n2025-07-06,0,0\n";
    expect(parseDailyCsv(text, 7)).toEqual([
      { repoId: 7, date: "2025-07-05", total: 12, unique: 3 },
      { repoId: 7, date: "2025-07-06", total: 0, unique: 0 },
    ]);
  });

  it("gives nothing for a header-only file", () => {
    expect(parseDailyCsv("Date,Total Views,Unique Views\n", 7)).toEqual([]);
  });
});

describe("parseWideCsv", () => {
  it("maps columns to paths and skips zero cells", () => {
    const text = "Date,/,/commits/main\n2025-07-05,136,0\r\n";
    expect(parseWideCsv(text, 7, "paths")).toEqual([
      { repoId: 7, path: "/", date: "2025-07-05", total: 136, unique: null },
    ]);
  });

  it("maps columns to referrers", () => {
    const text = "Date,udemy.com,github.com\n2025-07-05,0,4";
    expect(parseWideCsv(text, 7, "referrers")).toEqual([
      {
        repoId: 7,
        referrer: "github.com",
        date: "2025-07-05",
        total: 4,
        unique: null,
      },
    ]);
  });

  it("gives nothing for a header-only file", () => {
    expect(parseWideCsv("Date,/,/a\n", 7, "paths")).toEqual([]);
  });

  it("reads a quoted header as one column", () => {
    const text = 'Date,"a,b"\n2025-07-05,2';
    expect(parseWideCsv(text, 7, "referrers")).toEqual([
      {
        repoId: 7,
        referrer: "a,b",
        date: "2025-07-05",
        total: 2,
        unique: null,
      },
    ]);
  });
});
