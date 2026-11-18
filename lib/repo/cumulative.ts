export type DailyCount = { date: string; daily: number };
export type CumulativeDay = DailyCount & { cumulative: number };

export const toDailyCounts = (rows: { date: string; count: number }[]) =>
  rows.map(({ date, count }): DailyCount => ({ date, daily: count }));

const DAY_MS = 86_400_000;

const toIsoDate = (ms: number) => new Date(ms).toISOString().split("T")[0];

export function toCumulativeDays(days: DailyCount[]): CumulativeDay[] {
  if (days.length === 0) return [];

  const byDate = new Map(days.map(({ date, daily }) => [date, daily]));
  const first = [...byDate.keys()].sort()[0];
  const today = toIsoDate(Date.now());
  const history: CumulativeDay[] = [];
  let cumulative = 0;

  for (
    let ms = Date.parse(first) - DAY_MS;
    toIsoDate(ms) <= today;
    ms += DAY_MS
  ) {
    const date = toIsoDate(ms);
    const daily = byDate.get(date) ?? 0;
    cumulative += daily;
    history.push({ date, daily, cumulative });
  }

  return history;
}
