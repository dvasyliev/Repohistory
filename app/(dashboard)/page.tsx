import { Suspense } from "react";
import { RepoCardSkeletonGrid } from "@/app/components/repo/repo-card-skeleton";
import { SetupActionToast } from "@/app/components/setup-action-toast";
import { DashboardHeader } from "@/app/components/repo/dashboard-header";
import DashboardContent from "@/app/components/dashboard-content";

export default function Home() {
  return (
    <div className="container mx-auto flex flex-col gap-4 p-4 pt-6">
      <Suspense>
        <DashboardHeader />
      </Suspense>
      <Suspense fallback={<RepoCardSkeletonGrid />}>
        <DashboardContent />
      </Suspense>
      <Suspense>
        <SetupActionToast />
      </Suspense>
    </div>
  );
}
