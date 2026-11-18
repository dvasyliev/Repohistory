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
          <ol className="flex min-h-64 flex-col gap-3">
            {items.map((item) => (
              <li
                key={item.label}
                className="flex flex-col gap-1"
                title={item.label}
              >
                <div className="flex items-baseline justify-between gap-3 text-xs">
                  <span className="min-w-0 truncate">{item.label}</span>
                  <span className="shrink-0 tabular-nums">
                    {item.count.toLocaleString()}
                    {item.uniques !== null && (
                      <span className="ml-1 text-muted-foreground">
                        ({item.uniques.toLocaleString()} unique)
                      </span>
                    )}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-[#62C3F8]"
                    style={{ width: `${(item.count / max) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
