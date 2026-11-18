import type { CommitDay, CommitHistory } from "@/lib/repo/github-stats";

export function commitSeries(
  history: CommitHistory | null | undefined,
  allTime: boolean,
): CommitDay[] {
  if (!history) return [];
  const { days, weeks } = history;
  if (!allTime) return days;
  const firstWeek = weeks[0]?.date;
  if (firstWeek && days.length > 0 && firstWeek < days[0].date) return weeks;
  return firstWeek ? days.filter(({ date }) => date >= firstWeek) : days;
}
