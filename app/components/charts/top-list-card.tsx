"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Skeleton } from "@/app/components/ui/skeleton";
import type { TopItem } from "@/lib/repo/latest-snapshot";
import { NoDataMessage } from "./no-data-message";

interface TopListCardProps {
  title: string;
  dataType: string;
  date: string | null;
  items: TopItem[];
  isLoading: boolean;
}

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

export function TopListCard({
  title,
  dataType,
  date,
  items,
  isLoading,
}: TopListCardProps) {
  const max = items[0]?.count ?? 0;

  return (
    <Card className="w-full">
      <CardHeader className="border-b">
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          Views in the 14 days up to {date ? formatDate(date) : "today"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-64 flex-col gap-3">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-6 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <NoDataMessage dataType={dataType} hasAnyData={false} />
        ) : (
          <ol className="flex min-h-64 flex-col gap-1.5">
            {items.map((item) => (
              <li
                key={item.label}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-sm"
              >
                <div className="relative h-7 min-w-0">
                  <div
                    className="absolute inset-y-0 left-0 rounded-sm bg-[#62C3F8]/25"
                    style={{ width: `${(item.count / max) * 100}%` }}
                  />
                  <span
                    className="relative block truncate px-2 leading-7"
                    title={item.label}
                  >
                    {item.label}
                  </span>
                </div>
                <span className="text-right tabular-nums">
                  {item.count.toLocaleString()}
                  {item.uniques !== null && (
                    <span className="ml-1 text-muted-foreground">
                      ({item.uniques.toLocaleString()} unique)
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
