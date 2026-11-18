"use client";

import { useMemo } from "react";
import { Bar } from "recharts";
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
import type { CommitWeek } from "@/lib/repo/github-stats";

interface CommitActivityChartProps {
  weeks?: CommitWeek[] | null;
  isLoading?: boolean;
}

const commitsConfig = {
  commits: { label: "Commits", color: "#62C3F8" },
} satisfies ChartConfig;

const EMPTY: CommitWeek[] = [];

export function CommitActivityChart({
  weeks = EMPTY,
  isLoading = false,
}: CommitActivityChartProps) {
  const data = useMemo(
    () => (weeks ?? []).map(({ week, commits }) => ({ date: week, commits })),
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
          <CardDescription>Weekly commits in the last year</CardDescription>
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
      <CardContent className="pl-0">
        {weeks === null ? (
          <div className="flex h-64 items-center justify-center text-muted-foreground">
            GitHub is still counting commits. Reload in a minute.
          </div>
        ) : isLoading || hasNonZero(filteredData, ["commits"]) ? (
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
        ) : (
          <NoDataMessage
            dataType="commits"
            hasAnyData={hasNonZero(data, ["commits"])}
          />
        )}
      </CardContent>
    </Card>
  );
}
