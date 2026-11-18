import type { TrendData } from "@/lib/chart-trends";
import type { DateRange } from "@/lib/contexts/date-range-context";

export type MetricPoint = { date: string; value: number };
export type MetricSummary = { value: number; trend: TrendData | null };

const DAY_MS = 86_400_000;

const toDay = (date: Date) => date.toISOString().slice(0, 10);
const addDays = (day: string, days: number) =>
  toDay(new Date(new Date(day).getTime() + days * DAY_MS));
const daysBetween = (from: string, to: string) =>
  Math.round((new Date(to).getTime() - new Date(from).getTime()) / DAY_MS) + 1;

function compare(current: number, previous: number): TrendData {
  if (previous === 0) {
    return {
      current,
      previous,
      percentage: current > 0 ? 100 : 0,
      isIncrease: current > 0,
    };
  }
  const change = ((current - previous) / previous) * 100;
  return {
    current,
    previous,
    percentage: Math.abs(change),
    isIncrease: change >= 0,
  };
}

const sumBetween = (series: MetricPoint[], from: string, to: string) =>
  series
    .filter(({ date }) => date >= from && date <= to)
    .reduce((sum, { value }) => sum + value, 0);

// Compares the average per day with the same number of days before, or with the part of them the series covers.
// Today is left out: its numbers are still growing.
function averageTrend(
  series: MetricPoint[],
  from: Date,
  to: Date,
  today: string,
): TrendData | null {
  const fromDay = toDay(from);
  const start = new Date(fromDay) >= from ? fromDay : addDays(fromDay, 1);
  const lastDay = toDay(to);
  const end = lastDay >= today ? addDays(today, -1) : lastDay;
  const length = daysBetween(start, end);
  const previousEnd = addDays(start, -1);
  const coveredStart = [addDays(start, -length), series[0].date].sort()[1];
  const covered = daysBetween(coveredStart, previousEnd);
  if (length < 1 || covered < 1) return null;

  return compare(
    sumBetween(series, start, end) / length,
    sumBetween(series, coveredStart, previousEnd) / covered,
  );
}

export function sumInRange(
  series: MetricPoint[],
  { from, to }: DateRange,
  today: string = toDay(new Date()),
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
  const trend = from && to ? averageTrend(series, from, to, today) : null;
  return { value, trend };
}

export function changeInRange(
  series: MetricPoint[],
  { from }: DateRange,
): MetricSummary | null {
  const latest = series.at(-1);
  if (!latest) return null;
  const before = from
    ? series.filter((point) => new Date(point.date) < from).at(-1)
    : undefined;
  return {
    value: latest.value,
    trend: before ? compare(latest.value, before.value) : null,
  };
}
