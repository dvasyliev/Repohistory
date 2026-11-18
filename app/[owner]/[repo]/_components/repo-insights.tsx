"use client";

import { Suspense, use, type ReactNode } from "react";
import { useQueryState } from "nuqs";
import { StarsChart } from "@/app/components/charts/stars-chart";
import { ViewChart } from "@/app/components/charts/view-chart";
import { CloneChart } from "@/app/components/charts/clone-chart";
import { ReleaseChart } from "@/app/components/charts/release-chart";
import { ForksChart } from "@/app/components/charts/forks-chart";
import { WatchersChart } from "@/app/components/charts/watchers-chart";
import { CommitActivityChart } from "@/app/components/charts/commit-activity-chart";
import type { DateRange } from "@/lib/contexts/date-range-context";
import type { CommitWeek, CounterHistory } from "@/lib/db/traffic";
import type { RepoStarsData } from "@/lib/repo/stars";
import type { RepoReleaseData } from "@/lib/repo/releases";
import type { ForkDay } from "@/lib/repo/repo-stats";
import {
  latestValue,
  sumInRange,
  type MetricSummary,
} from "@/lib/repo/metric-summary";
import {
  chartParser,
  type ChartId,
} from "@/app/[owner]/[repo]/_lib/chart-param";
import { MetricTile } from "./metric-tile";

type Traffic = { timestamp: string; count: number; uniques: number };

export interface RepoInsightsData {
  views: Promise<{ count: number; uniques: number; views: Traffic[] }>;
  clones: Promise<{ count: number; uniques: number; clones: Traffic[] }>;
  stars: Promise<RepoStarsData>;
  forks: Promise<ForkDay[]>;
  commits: Promise<CommitWeek[]>;
  releases: Promise<RepoReleaseData>;
  counters: Promise<CounterHistory[]>;
}

const sumTraffic = (items: Traffic[], range: DateRange) =>
  sumInRange(
    items.map(({ timestamp, count }) => ({ date: timestamp, value: count })),
    range,
  );

const sumDaily = (items: { date: string; daily: number }[], range: DateRange) =>
  sumInRange(
    items.map(({ date, daily }) => ({ date, value: daily })),
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
        <Suspense fallback={<ViewChart isLoading />}>
          <Resolved data={data.views}>
            {(views) => <ViewChart traffic={{ views }} />}
          </Resolved>
        </Suspense>
      );
    case "clones":
      return (
        <Suspense fallback={<CloneChart isLoading />}>
          <Resolved data={data.clones}>
            {(clones) => <CloneChart traffic={{ clones }} />}
          </Resolved>
        </Suspense>
      );
    case "stars":
      return (
        <Suspense fallback={<StarsChart isLoading />}>
          <Resolved data={data.stars}>
            {(stars) => <StarsChart starsData={stars} />}
          </Resolved>
        </Suspense>
      );
    case "forks":
      return (
        <Suspense fallback={<ForksChart isLoading />}>
          <Resolved data={data.forks}>
            {(forks) => <ForksChart forksData={forks} />}
          </Resolved>
        </Suspense>
      );
    case "commits":
      return (
        <Suspense fallback={<CommitActivityChart isLoading />}>
          <Resolved data={data.commits}>
            {(weeks) => <CommitActivityChart weeks={weeks} />}
          </Resolved>
        </Suspense>
      );
    case "downloads":
      return (
        <Suspense fallback={<ReleaseChart isLoading />}>
          <Resolved data={data.releases}>
            {(releases) => <ReleaseChart releasesData={releases} />}
          </Resolved>
        </Suspense>
      );
    case "watchers":
      return (
        <Suspense fallback={<WatchersChart isLoading />}>
          <Resolved data={data.counters}>
            {(counters) => <WatchersChart counters={counters} />}
          </Resolved>
        </Suspense>
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
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
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
          summarize={(weeks, range) =>
            sumInRange(
              weeks.map(({ week, commits }) => ({
                date: week,
                value: commits,
              })),
              range,
            )
          }
        />
        <MetricTile
          label="Downloads"
          {...tile("downloads")}
          data={data.releases}
          summarize={(releases) =>
            noTrend(
              releases.releases.length > 0 ? releases.totalDownloads : null,
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
