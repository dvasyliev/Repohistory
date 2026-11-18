import { calculateTrendPercentage, type TrendData } from "@/lib/chart-trends";

type DayViews = { date: string; total: number };

const CARD_DAYS = 14;
const DAY_MS = 86_400_000;

function daysBefore(now: Date, days: number): string {
  return new Date(now.getTime() - days * DAY_MS).toISOString().split("T")[0];
}

export function cardViewsSince(now = new Date()): string {
  return daysBefore(now, CARD_DAYS);
}

export function summarizeCardViews(
  series: DayViews[][],
  now = new Date(),
): { last7Days: DayViews[]; totalViews: number; trend: TrendData | null } {
  const byDate = new Map<string, number>();
  for (const days of series) {
    for (const { date, total } of days) {
      byDate.set(date, (byDate.get(date) ?? 0) + total);
    }
  }

  const days: DayViews[] = [];
  for (let i = CARD_DAYS; i >= 1; i--) {
    const date = daysBefore(now, i);
    days.push({ date, total: byDate.get(date) ?? 0 });
  }

  const last7Days = days.slice(-7);
  return {
    last7Days,
    totalViews: last7Days.reduce((sum, day) => sum + day.total, 0),
    trend: calculateTrendPercentage(last7Days, days.slice(0, 7), "total"),
  };
}
