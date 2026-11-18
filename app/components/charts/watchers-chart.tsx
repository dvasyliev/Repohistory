"use client";

import { Line } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
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

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b">
        <div className="flex flex-col justify-center gap-1">
          <CardTitle role="heading" aria-level={2}>
            Watchers
          </CardTitle>
          <CardDescription>People watching the repo, by day</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="pl-0">
        {isLoading || hasNonZero(filteredData, ["watchers"]) ? (
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
