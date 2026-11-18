import { DateRangeProvider } from "@/lib/contexts/date-range-context";
import { Navbar } from "@/app/components/layout/navbar";
import { Skeleton } from "@/app/components/ui/skeleton";
import { ViewChart } from "@/app/components/charts/view-chart";
import { ReferrersChart } from "@/app/components/charts/referrers-chart";
import { PopularContentChart } from "@/app/components/charts/popular-content-chart";

const TILES = ["Views", "Clones", "Stars", "Forks", "Commits", "Watchers"];

export default function RepoLoading() {
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
            <ViewChart isLoading />
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ReferrersChart isLoading />
            <PopularContentChart isLoading />
          </div>
        </div>
      </div>
    </DateRangeProvider>
  );
}
