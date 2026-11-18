"use client";

import { useMemo } from "react";
import { latestSnapshot } from "@/lib/repo/latest-snapshot";
import { TopListCard } from "./top-list-card";

interface ReferrersChartProps {
  traffic?: {
    referrers: Array<{
      referrer: string;
      data: Array<{
        timestamp: string;
        count: number;
        uniques: number | null;
      }>;
    }>;
  };
  isLoading?: boolean;
}

export function ReferrersChart({
  traffic,
  isLoading = false,
}: ReferrersChartProps) {
  const snapshot = useMemo(
    () =>
      latestSnapshot(
        (traffic?.referrers ?? []).map(({ referrer, data }) => ({
          label: referrer,
          data,
        })),
      ),
    [traffic],
  );

  return (
    <TopListCard
      title="Referring Sites"
      dataType="referrers"
      date={snapshot.date}
      items={snapshot.items}
      isLoading={isLoading}
    />
  );
}
