export const REPO_SORTS = [
  "views",
  "stars",
  "forks",
  "activity",
  "name",
] as const;

export type RepoSort = (typeof REPO_SORTS)[number];

export type RepoSortKeys = {
  id: number;
  name: string;
  stars: number;
  forks: number;
  pushedAt: string | null;
  views14: number;
};

export function parseRepoSort(value: string | null): RepoSort {
  return REPO_SORTS.find((sort) => sort === value) ?? "stars";
}

function compareNames(a: RepoSortKeys, b: RepoSortKeys): number {
  return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
}

function comparePushedAt(a: string | null, b: string | null): number {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return b.localeCompare(a);
}

function compareBy(sort: RepoSort, a: RepoSortKeys, b: RepoSortKeys): number {
  switch (sort) {
    case "views":
      return b.views14 - a.views14;
    case "stars":
      return b.stars - a.stars;
    case "forks":
      return b.forks - a.forks;
    case "activity":
      return comparePushedAt(a.pushedAt, b.pushedAt);
    case "name":
      return 0;
  }
}

export function sortRepoIds(keys: RepoSortKeys[], sort: RepoSort): number[] {
  return [...keys]
    .sort((a, b) => compareBy(sort, a, b) || compareNames(a, b))
    .map((key) => key.id);
}
