import type { Repo } from "@/lib/types";
import type { RepoSortKeys } from "@/lib/repo/sort";
import { RepoCard } from "./repo-card";
import { SortedRepoGrid } from "./sorted-repo-grid";

interface Props {
  repos: Repo[];
  views14: Map<number, number>;
}

export function RepoGrid({ repos, views14 }: Props) {
  const cards = Object.fromEntries(
    repos.map((repo) => [repo.id, <RepoCard key={repo.id} repo={repo} />]),
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
