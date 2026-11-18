import { calculateTrendPercentage, type TrendData } from "@/lib/chart-trends";
import type { DateRange } from "@/lib/contexts/date-range-context";

export type MetricPoint = { date: string; value: number };
export type MetricSummary = { value: number; trend: TrendData | null };

export function sumInRange(
  series: MetricPoint[],
  { from, to }: DateRange,
): MetricSummary | null {
  if (series.length === 0) return null;
  const inRange =
    from && to
      ? series.filter((point) => {
          const date = new Date(point.date);
          return date >= from && date <= to;
        })
      : series;
  const value = inRange.reduce((sum, point) => sum + point.value, 0);
  const trend =
    from && to ? calculateTrendPercentage(inRange, series, "value") : null;
  return { value, trend };
}

export function latestValue(series: MetricPoint[]): number | null {
  return series.at(-1)?.value ?? null;
}
