import type { Repo } from "@/lib/types";
import type { RepoSortKeys } from "@/lib/repo/sort";
import type { DailyHistory } from "@/lib/db/traffic";
import { RepoCard } from "./repo-card";
import { SortedRepoGrid } from "./sorted-repo-grid";

interface Props {
  repos: Repo[];
  recentViews: Map<number, DailyHistory[]>;
  views14: Map<number, number>;
}

export function RepoGrid({ repos, recentViews, views14 }: Props) {
  const cards = Object.fromEntries(
    repos.map((repo) => [
      repo.id,
      <RepoCard
        key={repo.id}
        repo={repo}
        views={recentViews.get(repo.id) ?? []}
      />,
    ]),
  );
  const keys: RepoSortKeys[] = repos.map((repo) => ({
    id: repo.id,
    name: repo.full_name,
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    pushedAt: repo.pushed_at,
    views14: views14.get(repo.id) ?? 0,
  }));

  return <SortedRepoGrid cards={cards} keys={keys} />;
}
