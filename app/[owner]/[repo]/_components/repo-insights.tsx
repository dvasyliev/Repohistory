"use client";

import { Suspense, use, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { useQueryState } from "nuqs";
import type { DateRange } from "@/lib/contexts/date-range-context";
import type { CounterHistory } from "@/lib/db/traffic";
import type { CommitHistory } from "@/lib/repo/github-stats";
import type { RepoStarsData } from "@/lib/repo/stars";
import { toCumulativeDays, type DailyCount } from "@/lib/repo/cumulative";
import {
  latestValue,
  sumInRange,
  type MetricSummary,
} from "@/lib/repo/metric-summary";
import {
  chartParser,
  type ChartId,
} from "@/app/[owner]/[repo]/_lib/chart-param";
import { ChartErrorBoundary } from "@/app/components/charts/chart-error-boundary";
import { commitSeries } from "@/lib/repo/commit-series";
import { MetricTile } from "./metric-tile";
import { ChartSkeleton } from "./chart-skeleton";

const loading = () => <ChartSkeleton />;

const ViewChart = dynamic(
  () => import("@/app/components/charts/view-chart").then((m) => m.ViewChart),
  { loading, ssr: false },
);
const CloneChart = dynamic(
  () => import("@/app/components/charts/clone-chart").then((m) => m.CloneChart),
  { loading, ssr: false },
);
const StarsChart = dynamic(
  () => import("@/app/components/charts/stars-chart").then((m) => m.StarsChart),
  { loading, ssr: false },
);
const ForksChart = dynamic(
  () => import("@/app/components/charts/forks-chart").then((m) => m.ForksChart),
  { loading, ssr: false },
);
const CommitActivityChart = dynamic(
  () =>
    import("@/app/components/charts/commit-activity-chart").then(
      (m) => m.CommitActivityChart,
    ),
  { loading, ssr: false },
);
const WatchersChart = dynamic(
  () =>
    import("@/app/components/charts/watchers-chart").then(
      (m) => m.WatchersChart,
    ),
  { loading, ssr: false },
);

type Traffic = { timestamp: string; count: number; uniques: number };

export interface RepoInsightsData {
  views: Promise<{ count: number; uniques: number; views: Traffic[] }>;
  clones: Promise<{ count: number; uniques: number; clones: Traffic[] }>;
  stars: Promise<RepoStarsData>;
  forks: Promise<DailyCount[]>;
  commits: Promise<CommitHistory | null>;
  counters: Promise<CounterHistory[]>;
}

const sumTraffic = (items: Traffic[], range: DateRange) =>
  sumInRange(
    items.map(({ timestamp, count }) => ({ date: timestamp, value: count })),
    range,
  );

const sumDaily = (items: DailyCount[], range: DateRange) =>
  sumInRange(
    toCumulativeDays(items).map(({ date, daily }) => ({ date, value: daily })),
    range,
  );

const noTrend = (value: number | null): MetricSummary | null =>
  value === null ? null : { value, trend: null };

function Resolved<T>({
  data,
  children,
}: {
  data: Promise<T>;
  children: (value: T) => ReactNode;
}) {
  return children(use(data));
}

function ChartSlot<T>({
  name,
  data,
  children,
}: {
  name: string;
  data: Promise<T>;
  children: (value: T) => ReactNode;
}) {
  return (
    <ChartErrorBoundary name={name} resetKey={data}>
      <Suspense fallback={<ChartSkeleton />}>
        <Resolved data={data}>{children}</Resolved>
      </Suspense>
    </ChartErrorBoundary>
  );
}

function SelectedChart({
  chart,
  data,
}: {
  chart: ChartId;
  data: RepoInsightsData;
}) {
  switch (chart) {
    case "views":
      return (
        <ChartSlot name="views" data={data.views}>
          {(views) => <ViewChart traffic={{ views }} />}
        </ChartSlot>
      );
    case "clones":
      return (
        <ChartSlot name="clones" data={data.clones}>
          {(clones) => <CloneChart traffic={{ clones }} />}
        </ChartSlot>
      );
    case "stars":
      return (
        <ChartSlot name="stars" data={data.stars}>
          {(stars) => <StarsChart starsData={stars} />}
        </ChartSlot>
      );
    case "forks":
      return (
        <ChartSlot name="forks" data={data.forks}>
          {(forks) => <ForksChart forksData={forks} />}
        </ChartSlot>
      );
    case "commits":
      return (
        <ChartSlot name="commits" data={data.commits}>
          {(history) => <CommitActivityChart history={history} />}
        </ChartSlot>
      );
    case "watchers":
      return (
        <ChartSlot name="watchers" data={data.counters}>
          {(counters) => <WatchersChart counters={counters} />}
        </ChartSlot>
      );
  }
}

export function RepoInsights({ data }: { data: RepoInsightsData }) {
  const [chart, setChart] = useQueryState("chart", chartParser);
  const tile = (id: ChartId) => ({
    selected: chart === id,
    onSelect: () => void setChart(id),
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <MetricTile
          label="Views"
          {...tile("views")}
          data={data.views}
          summarize={(views, range) => sumTraffic(views.views, range)}
        />
        <MetricTile
          label="Clones"
          {...tile("clones")}
          data={data.clones}
          summarize={(clones, range) => sumTraffic(clones.clones, range)}
        />
        <MetricTile
          label="Stars"
          {...tile("stars")}
          data={data.stars}
          summarize={(stars, range) => sumDaily(stars.starsHistory, range)}
        />
        <MetricTile
          label="Forks"
          {...tile("forks")}
          data={data.forks}
          summarize={sumDaily}
        />
        <MetricTile
          label="Commits"
          {...tile("commits")}
          data={data.commits}
          summarize={(history, range) =>
            sumInRange(
              commitSeries(history, !range.from).map(({ date, commits }) => ({
                date,
                value: commits,
              })),
              range,
            )
          }
        />
        <MetricTile
          label="Watchers"
          {...tile("watchers")}
          data={data.counters}
          summarize={(counters) =>
            noTrend(
              latestValue(
                counters.map(({ date, watchers }) => ({
                  date,
                  value: watchers,
                })),
              ),
            )
          }
        />
      </div>
      <SelectedChart chart={chart} data={data} />
    </div>
  );
}
