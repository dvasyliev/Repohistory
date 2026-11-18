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

function sumByDate(lists: CommitDay[][]): CommitDay[] {
  const totals = new Map<string, number>();
  for (const { date, commits } of lists.flat()) {
    totals.set(date, (totals.get(date) ?? 0) + commits);
  }
  return [...totals]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, commits]) => ({ date, commits }));
}

export function sumCommitHistories(histories: CommitHistory[]): CommitHistory {
  return {
    days: sumByDate(histories.map(({ days }) => days)),
    weeks: sumByDate(histories.map(({ weeks }) => weeks)),
  };
}
