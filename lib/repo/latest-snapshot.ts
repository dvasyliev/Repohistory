type Point = { timestamp: string; count: number; uniques: number | null };
export type TopItem = { label: string; count: number; uniques: number | null };

const MAX_ITEMS = 10;

export function latestSnapshot(series: { label: string; data: Point[] }[]): {
  date: string | null;
  items: TopItem[];
} {
  const date =
    series
      .flatMap(({ data }) => data.map(({ timestamp }) => timestamp))
      .sort()
      .at(-1) ?? null;
  const items = series
    .flatMap(({ label, data }) =>
      data
        .filter((point) => point.timestamp === date && point.count > 0)
        .map(({ count, uniques }) => ({ label, count, uniques })),
    )
    .sort((a, b) => b.count - a.count)
    .slice(0, MAX_ITEMS);
  return { date, items };
}
