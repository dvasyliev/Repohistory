"use client";

import { Suspense, use } from "react";
import { Loader } from "lucide-react";
import { Skeleton } from "@/app/components/ui/skeleton";
import { ChartErrorBoundary } from "@/app/components/charts/chart-error-boundary";
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
  summarize: (data: T, range: DateRange) => MetricSummary | null | "pending";
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
      <ChartErrorBoundary name={label.toLowerCase()} compact resetKey={data}>
        <Suspense fallback={<Skeleton className="h-7 w-16" />}>
          <TileValue data={data} summarize={summarize} />
        </Suspense>
      </ChartErrorBoundary>
    </button>
  );
}

function TileValue<T>({
  data,
  summarize,
}: Pick<MetricTileProps<T>, "data" | "summarize">) {
  const { dateRange } = useDateRange();
  const summary = summarize(use(data), dateRange);
  if (summary === "pending") {
    return (
      <span className="flex h-7 items-center gap-2 text-sm text-muted-foreground">
        <Loader className="h-4 w-4 animate-spin" aria-hidden="true" />
        Counting…
      </span>
    );
  }
  return (
    <span className="flex h-7 items-center gap-2">
      <span className="text-xl font-bold sm:text-2xl">
        {summary ? summary.value.toLocaleString() : "—"}
      </span>
      {summary && <TrendIndicator trend={summary.trend} />}
    </span>
  );
}
