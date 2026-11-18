import { summarizeCardViews } from "@/lib/repo/card-views";
import type { DailyHistory } from "@/lib/db/traffic";
import { RepoPreviewChart } from "./repo-preview-chart";
import { TrendIndicator } from "@/app/components/charts/trend-indicator";

export function RepoCardContent({ series }: { series: DailyHistory[][] }) {
  const { last7Days, totalViews, trend } = summarizeCardViews(series);

  return (
    <>
      <div className="pointer-events-none h-24 w-full">
        <RepoPreviewChart data={last7Days} />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm">
          <strong>{totalViews}</strong> views in last 7d
        </span>
        <TrendIndicator trend={trend} />
      </div>
    </>
  );
}
