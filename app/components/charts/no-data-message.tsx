"use client";

import { useDateRange } from "@/lib/contexts/date-range-context";

interface NoDataMessageProps {
  dataType: string;
}

export function NoDataMessage({ dataType }: NoDataMessageProps) {
  const { selectedPeriod } = useDateRange();

  const getMessage = () => {
    if (selectedPeriod === "all") {
      return `No ${dataType} available`;
    }

    return `No ${dataType} over the past ${selectedPeriod} days`;
  };

  return (
    <div className="flex h-64 items-center justify-center text-muted-foreground">
      {getMessage()}
    </div>
  );
}
