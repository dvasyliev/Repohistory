"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Loader } from "lucide-react";
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
import { hasNonZero } from "@/lib/chart-empty";
import { useDateFiltered } from "./use-date-filtered";
import { useDateRange } from "@/lib/contexts/date-range-context";
import { commitSeries } from "@/lib/repo/commit-series";
import type { CommitHistory } from "@/lib/repo/github-stats";

const RETRY_MS = 10_000;

interface CommitActivityChartProps {
  history?: CommitHistory | null;
  isLoading?: boolean;
}

const commitsConfig = {
  commits: { label: "Commits", color: "#62C3F8" },
} satisfies ChartConfig;

export function CommitActivityChart({
  history,
  isLoading = false,
}: CommitActivityChartProps) {
  const { selectedPeriod } = useDateRange();
  const router = useRouter();

  useEffect(() => {
    if (history !== null) return;
    const timer = setTimeout(() => router.refresh(), RETRY_MS);
    return () => clearTimeout(timer);
  }, [history, router]);
  const data = useMemo(
    () => commitSeries(history, selectedPeriod === "all"),
    [history, selectedPeriod],
  );
  const weekly = data.length > 0 && data === history?.weeks;
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
            {weekly ? "Weekly commits since the first commit" : "Daily commits"}
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
      <CardContent className="pl-0">
        {history === null ? (
          <div className="flex h-64 items-center justify-center gap-2 text-muted-foreground">
            <Loader className="h-4 w-4 animate-spin" aria-hidden="true" />
            GitHub is counting commits. This updates by itself.
          </div>
        ) : isLoading || hasNonZero(filteredData, ["commits"]) ? (
          <Chart
            data={isLoading ? [] : filteredData}
            chartConfig={commitsConfig}
            className="h-64 w-full"
            isLoading={isLoading}
          >
            <Area
              isAnimationActive={false}
              dataKey="commits"
              fill="var(--color-commits)"
              fillOpacity={0.3}
              stroke="var(--color-commits)"
              strokeWidth={2}
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
