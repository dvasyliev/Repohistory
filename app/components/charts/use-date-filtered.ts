import { useMemo } from "react";
import { useDateRange } from "@/lib/contexts/date-range-context";

export function useDateFiltered<T extends { date: string }>(data: T[]): T[] {
  const { dateRange } = useDateRange();
  return useMemo(() => {
    const { from, to } = dateRange;
    if (!from || !to) return data;
    return data.filter((item) => {
      const itemDate = new Date(item.date);
      return itemDate >= from && itemDate <= to;
    });
  }, [data, dateRange]);
}
