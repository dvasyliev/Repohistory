"use client";

import { useMemo } from "react";
import { latestSnapshot } from "@/lib/repo/latest-snapshot";
import { TopListCard } from "./top-list-card";

interface PopularContentChartProps {
  traffic?: {
    paths: Array<{
      path: string;
      title: string;
      data: Array<{
        timestamp: string;
        count: number;
        uniques: number | null;
      }>;
    }>;
  };
  isLoading?: boolean;
}

export function PopularContentChart({
  traffic,
  isLoading = false,
}: PopularContentChartProps) {
  const snapshot = useMemo(
    () =>
      latestSnapshot(
        (traffic?.paths ?? []).map(({ path, data }) => ({
          label: path,
          data,
        })),
      ),
    [traffic],
  );

  return (
    <TopListCard
      title="Popular Content"
      dataType="popular content"
      date={snapshot.date}
      items={snapshot.items}
      isLoading={isLoading}
    />
  );
}
