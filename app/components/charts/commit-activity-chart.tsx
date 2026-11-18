"use client";

import { useMemo } from "react";
import { Bar, Line } from "recharts";
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
import type { CommitWeek } from "@/lib/db/traffic";

interface CommitActivityChartProps {
  weeks?: CommitWeek[];
  isLoading?: boolean;
}

const commitsConfig = {
  commits: { label: "Commits", color: "#62C3F8" },
} satisfies ChartConfig;

const linesConfig = {
  additions: { label: "Additions", color: "#2da44e" },
  deletions: { label: "Deletions", color: "#e5484d" },
} satisfies ChartConfig;

const EMPTY: CommitWeek[] = [];

export function CommitActivityChart({
  weeks = EMPTY,
  isLoading = false,
}: CommitActivityChartProps) {
  const data = useMemo(
    () => weeks.map(({ week, ...rest }) => ({ date: week, ...rest })),
    [weeks],
  );
  const filteredData = useDateFiltered(data);
  const totalCommits = useMemo(
    () => filteredData.reduce((sum, item) => sum + item.commits, 0),
    [filteredData],
  );

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b">
        <div className="flex flex-col justify-center gap-1">
          <CardTitle role="heading" aria-level={2}>
            Commit Activity
          </CardTitle>
          <CardDescription>
            Weekly commits, additions and deletions
          </CardDescription>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-xs text-muted-foreground">Total Commits</span>
          {isLoading ? (
            <Skeleton className="h-6 w-24" />
          ) : (
            <span className="text-lg leading-none font-bold sm:text-2xl">
              {totalCommits.toLocaleString()}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pl-0">
        {isLoading || filteredData.length > 0 ? (
          <>
            <Chart
              data={isLoading ? [] : filteredData}
              chartConfig={commitsConfig}
              className="h-64 w-full"
              isLoading={isLoading}
            >
              <Bar
                isAnimationActive={false}
                dataKey="commits"
                fill="var(--color-commits)"
              />
            </Chart>
            <Chart
              data={isLoading ? [] : filteredData}
              chartConfig={linesConfig}
              className="h-48 w-full"
              isLoading={isLoading}
            >
              <Line
                isAnimationActive={false}
                dataKey="additions"
                stroke="var(--color-additions)"
                strokeWidth={2}
                dot={false}
              />
              <Line
                isAnimationActive={false}
                dataKey="deletions"
                stroke="var(--color-deletions)"
                strokeWidth={2}
                dot={false}
              />
            </Chart>
          </>
        ) : (
          <NoDataMessage dataType="commit activity" />
        )}
      </CardContent>
    </Card>
  );
}
