"use client";

import { useMemo } from "react";
import { Area } from "recharts";
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
import { useDateFiltered } from "./use-date-filtered";
import type { ForkDay } from "@/lib/repo/repo-stats";

interface ForksChartProps {
  forksData?: ForkDay[];
  isLoading?: boolean;
  description?: string;
}

const chartConfig = {
  forks: {
    label: "Forks",
    color: "#62C3F8",
  },
} satisfies ChartConfig;

export function ForksChart({
  forksData,
  isLoading = false,
  description = "Repo fork growth, cumulative",
}: ForksChartProps) {
  const data = useMemo(
    () =>
      (forksData ?? []).map(({ date, cumulative }) => ({
        date,
        forks: cumulative,
      })),
    [forksData],
  );
  const filteredData = useDateFiltered(data);
  const total = filteredData.at(-1)?.forks ?? 0;

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b">
        <div className="flex flex-col justify-center gap-1">
          <CardTitle role="heading" aria-level={2}>
            Forks Over Time
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-xs text-muted-foreground">Total Forks</span>
          {isLoading ? (
            <Skeleton className="h-6 w-24" />
          ) : (
            <span className="text-lg leading-none font-bold sm:text-2xl">
              {total.toLocaleString()}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="pl-0">
        {isLoading || filteredData.length > 0 ? (
          <Chart
            data={isLoading ? [] : filteredData}
            chartConfig={chartConfig}
            className="h-64 w-full"
            isLoading={isLoading}
          >
            <Area
              isAnimationActive={false}
              dataKey="forks"
              fill="var(--color-forks)"
              fillOpacity={0.3}
              stroke="var(--color-forks)"
              strokeWidth={2}
            />
          </Chart>
        ) : (
          <NoDataMessage dataType="forks" />
        )}
      </CardContent>
    </Card>
  );
}
