export type ChartMode = "Date" | "Timeline";

interface StarRecord {
  date: string;
  count: number;
}

interface RepoStarData {
  repo: string;
  starRecords: StarRecord[];
}

export interface RepoData extends RepoStarData {
  logoUrl: string;
}
