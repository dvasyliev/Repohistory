"use client";

import { useState } from "react";
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
import { useDateFiltered } from "./use-date-filtered";
import type { CounterHistory } from "@/lib/db/traffic";

interface CountersChartProps {
  counters?: CounterHistory[];
  isLoading?: boolean;
}

const chartConfig = {
  stars: { label: "Stars", color: "#62C3F8" },
  forks: { label: "Forks", color: "#315c72" },
  watchers: { label: "Watchers", color: "#f5a623" },
  openIssues: { label: "Open issues", color: "#e5484d" },
} satisfies ChartConfig;

const EMPTY: CounterHistory[] = [];

export function CountersChart({
  counters = EMPTY,
  isLoading = false,
}: CountersChartProps) {
  const [hiddenSeries, setHiddenSeries] = useState<string[]>([]);
  const filteredData = useDateFiltered(counters);

  const toggleSeries = (dataKey: string) =>
    setHiddenSeries((prev) =>
      prev.includes(dataKey)
        ? prev.filter((key) => key !== dataKey)
        : [...prev, dataKey],
    );

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b">
        <div className="flex flex-col justify-center gap-1">
          <CardTitle role="heading" aria-level={2}>
            Repository Counters
          </CardTitle>
          <CardDescription>
            Daily stars, forks, watchers and open issues
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="pl-0">
        {isLoading || filteredData.length > 0 ? (
          <Chart
            data={isLoading ? [] : filteredData}
            chartConfig={chartConfig}
            className="h-64 w-full"
            onLegendClick={isLoading ? undefined : toggleSeries}
            hiddenSeries={hiddenSeries}
            isLoading={isLoading}
          >
            {Object.keys(chartConfig).map((key) => (
              <Line
                key={key}
                isAnimationActive={false}
                dataKey={key}
                stroke={`var(--color-${key})`}
                strokeWidth={2}
                dot={false}
                hide={hiddenSeries.includes(key)}
              />
            ))}
          </Chart>
        ) : (
          <NoDataMessage dataType="counters" />
        )}
      </CardContent>
    </Card>
  );
}
