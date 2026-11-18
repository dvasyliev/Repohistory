"use client";

import { Line } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Skeleton } from "@/app/components/ui/skeleton";
import type { ChartConfig } from "@/app/components/ui/chart";
import { Chart } from "./chart";
import { NoDataMessage } from "./no-data-message";
import { hasNonZero } from "@/lib/chart-empty";
import { useDateFiltered } from "./use-date-filtered";
import type { CounterHistory } from "@/lib/db/traffic";

interface WatchersChartProps {
  counters?: CounterHistory[];
  isLoading?: boolean;
}

const chartConfig = {
  watchers: { label: "Watchers", color: "#f5a623" },
} satisfies ChartConfig;

const EMPTY: CounterHistory[] = [];

export function WatchersChart({
  counters = EMPTY,
  isLoading = false,
}: WatchersChartProps) {
  const filteredData = useDateFiltered(counters);
  const firstDate = counters[0]?.date;
  const tooFewDays =
    filteredData.length < 2 && hasNonZero(filteredData, ["watchers"]);

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b">
        <div className="flex flex-col justify-center gap-1">
          <CardTitle role="heading" aria-level={2}>
            Watchers
          </CardTitle>
          <CardDescription>People watching the repo, by day</CardDescription>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-xs text-muted-foreground">Watchers Now</span>
          {isLoading ? (
            <Skeleton className="h-6 w-24" />
          ) : (
            <span className="text-lg leading-none font-bold sm:text-2xl">
              {(counters.at(-1)?.watchers ?? 0).toLocaleString()}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="pl-0">
        {tooFewDays && firstDate ? (
          <NoDataMessage
            dataType="watchers"
            hasAnyData
            message={`Watchers are tracked from ${new Date(
              firstDate,
            ).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}. The chart fills in day by day.`}
          />
        ) : isLoading || hasNonZero(filteredData, ["watchers"]) ? (
          <Chart
            data={isLoading ? [] : filteredData}
            chartConfig={chartConfig}
            className="h-64 w-full"
            isLoading={isLoading}
          >
            <Line
              isAnimationActive={false}
              dataKey="watchers"
              stroke="var(--color-watchers)"
              strokeWidth={2}
              dot={false}
            />
          </Chart>
        ) : (
          <NoDataMessage
            dataType="watchers"
            hasAnyData={hasNonZero(counters, ["watchers"])}
          />
        )}
      </CardContent>
    </Card>
  );
}
