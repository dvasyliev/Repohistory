import { DateRangeProvider } from "@/lib/contexts/date-range-context";
import { Navbar } from "@/app/components/layout/navbar";
import { Skeleton } from "@/app/components/ui/skeleton";
import { ChartSkeleton } from "./chart-skeleton";

const TILES = ["Views", "Clones", "Stars", "Forks", "Commits", "Watchers"];

export function InsightsPageSkeleton() {
  return (
    <DateRangeProvider fullName="">
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <div className="container mx-auto space-y-6 p-4 sm:p-10">
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
              {TILES.map((label) => (
                <div
                  key={label}
                  className="flex flex-col gap-1 rounded-xl border bg-card p-4"
                >
                  <span className="text-sm text-muted-foreground">{label}</span>
                  <Skeleton className="h-7 w-16" />
                </div>
              ))}
            </div>
            <ChartSkeleton />
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
        </div>
      </div>
    </DateRangeProvider>
  );
}
