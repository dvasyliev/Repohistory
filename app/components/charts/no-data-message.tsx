"use client";

import { emptyChartMessage } from "@/lib/chart-empty";
import { useDateRange } from "@/lib/contexts/date-range-context";

interface NoDataMessageProps {
  dataType: string;
  hasAnyData: boolean;
  message?: string;
}

export function NoDataMessage({
  dataType,
  hasAnyData,
  message,
}: NoDataMessageProps) {
  const { selectedPeriod } = useDateRange();

  return (
    <div className="flex h-64 items-center justify-center px-4 text-center text-muted-foreground">
      {message ?? emptyChartMessage(dataType, hasAnyData, selectedPeriod)}
    </div>
  );
}
