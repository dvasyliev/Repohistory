"use client";

import { Suspense, use } from "react";
import { Skeleton } from "@/app/components/ui/skeleton";
import { TrendIndicator } from "@/app/components/charts/trend-indicator";
import {
  useDateRange,
  type DateRange,
} from "@/lib/contexts/date-range-context";
import type { MetricSummary } from "@/lib/repo/metric-summary";
import { cn } from "@/lib/utils";

interface MetricTileProps<T> {
  label: string;
  selected: boolean;
  onSelect: () => void;
  data: Promise<T>;
  summarize: (data: T, range: DateRange) => MetricSummary | null;
}

export function MetricTile<T>({
  label,
  selected,
  onSelect,
  data,
  summarize,
}: MetricTileProps<T>) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "flex cursor-pointer flex-col gap-1 rounded-xl border bg-card p-4 text-left transition-colors hover:bg-accent",
        selected && "border-primary bg-accent",
      )}
    >
      <span className="text-sm text-muted-foreground">{label}</span>
      <Suspense fallback={<Skeleton className="h-7 w-16" />}>
        <TileValue data={data} summarize={summarize} />
      </Suspense>
    </button>
  );
}

function TileValue<T>({
  data,
  summarize,
}: Pick<MetricTileProps<T>, "data" | "summarize">) {
  const { dateRange } = useDateRange();
  const summary = summarize(use(data), dateRange);
  return (
    <span className="flex h-7 items-center gap-2">
      <span className="text-xl font-bold sm:text-2xl">
        {summary ? summary.value.toLocaleString() : "—"}
      </span>
      {summary && <TrendIndicator trend={summary.trend} />}
    </span>
  );
}
