import type { Repo } from "@/lib/types";
import { RepoCard } from "./repo-card";

interface Props {
  repos: Repo[];
}

export function RepoGrid({ repos }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
      {repos
        .sort((a: Repo, b: Repo) => b.stargazers_count - a.stargazers_count)
        .map((repo: Repo) => (
          <RepoCard key={repo.id} repo={repo} />
        ))}
    </div>
  );
}
