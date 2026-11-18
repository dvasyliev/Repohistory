import { parseAsStringLiteral } from "nuqs";

const CHART_IDS = [
  "views",
  "clones",
  "stars",
  "forks",
  "commits",
  "watchers",
] as const;

export type ChartId = (typeof CHART_IDS)[number];

export const chartParser = parseAsStringLiteral(CHART_IDS).withDefault("views");
