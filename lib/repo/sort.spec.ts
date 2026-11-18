import { describe, expect, it } from "vitest";
import { parseRepoSort, sortRepoIds, type RepoSortKeys } from "./sort";

const keys: RepoSortKeys[] = [
  {
    id: 1,
    name: "b",
    stars: 5,
    forks: 1,
    pushedAt: "2026-11-01T00:00:00Z",
    views14: 0,
  },
  { id: 2, name: "A", stars: 5, forks: 3, pushedAt: null, views14: 9 },
  {
    id: 3,
    name: "c",
    stars: 1,
    forks: 2,
    pushedAt: "2026-11-17T00:00:00Z",
    views14: 4,
  },
];

describe("parseRepoSort", () => {
  it("falls back to stars for unknown or missing values", () => {
    expect(parseRepoSort("bogus")).toBe("views");
    expect(parseRepoSort(null)).toBe("views");
  });

  it("accepts every known key", () => {
    expect(parseRepoSort("views")).toBe("views");
    expect(parseRepoSort("name")).toBe("name");
  });
});

describe("sortRepoIds", () => {
  it("sorts by stars, ties by name", () => {
    expect(sortRepoIds(keys, "stars")).toEqual([2, 1, 3]);
  });

  it("sorts by forks", () => {
    expect(sortRepoIds(keys, "forks")).toEqual([2, 3, 1]);
  });

  it("sorts by recent views", () => {
    expect(sortRepoIds(keys, "views")).toEqual([2, 3, 1]);
  });

  it("sorts by activity with null last", () => {
    expect(sortRepoIds(keys, "activity")).toEqual([3, 1, 2]);
  });

  it("sorts by name ignoring case", () => {
    expect(sortRepoIds(keys, "name")).toEqual([2, 1, 3]);
  });
});
