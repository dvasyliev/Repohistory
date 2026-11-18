import type { Repo } from "@/lib/types";
import type { DailyHistory } from "@/lib/db/traffic";
import { OwnerCard } from "./owner-card";

interface OwnerData {
  owner: string;
  repos: Repo[];
  totalStars: number;
}

interface Props {
  reposByOwner: Record<string, Repo[]>;
  recentViews: Map<number, DailyHistory[]>;
}

export function OwnerGrid({ reposByOwner, recentViews }: Props) {
  const ownerData = Object.entries(reposByOwner).map(([owner, repos]) => ({
    owner,
    repos,
    totalStars: repos.reduce((sum, repo) => sum + repo.stargazers_count, 0),
  }));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
      {ownerData
        .sort((a, b) => b.totalStars - a.totalStars)
        .map((ownerData: OwnerData) => (
          <OwnerCard
            key={ownerData.owner}
            ownerData={ownerData}
            views={ownerData.repos.map(
              (repo) => recentViews.get(repo.id) ?? [],
            )}
          />
        ))}
    </div>
  );
}
