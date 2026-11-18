import { DateRangeProvider } from "@/lib/contexts/date-range-context";
import { Navbar } from "@/app/components/layout/navbar";
import { StarsChart } from "@/app/components/charts/stars-chart";
import { ForksChart } from "@/app/components/charts/forks-chart";
import { ViewChart } from "@/app/components/charts/view-chart";
import { CloneChart } from "@/app/components/charts/clone-chart";
import { ReferrersChart } from "@/app/components/charts/referrers-chart";
import { PopularContentChart } from "@/app/components/charts/popular-content-chart";

export default function OwnerLoading() {
  return (
    <DateRangeProvider fullName="">
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <div className="container mx-auto space-y-6 p-4 sm:p-10">
          <StarsChart isLoading />
          <ForksChart isLoading />
          <ViewChart isLoading />
          <CloneChart isLoading />
          <ReferrersChart isLoading />
          <PopularContentChart isLoading />
        </div>
      </div>
    </DateRangeProvider>
  );
}
