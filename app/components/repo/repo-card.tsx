import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { GitFork, Star } from "lucide-react";
import type { Repo } from "@/lib/types";
import { Suspense } from "react";
import { RepoCardContent } from "./repo-card-content";
import { RepoCardContentSkeleton } from "./repo-card-skeleton";

export function RepoCard({ repo }: { repo: Repo }) {
  return (
    <Link href={`/${repo.full_name}`}>
      <Card className="h-52 w-full cursor-pointer gap-2 transition-all duration-200 hover:bg-accent active:scale-99">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="truncate text-lg font-semibold">
            {repo.full_name}
          </CardTitle>
          <div className="flex shrink-0 items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1" title="Stars">
              <Star className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Stars:</span>
              {repo.stargazers_count}
            </span>
            <span className="flex items-center gap-1" title="Forks">
              <GitFork className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Forks:</span>
              {repo.forks_count}
            </span>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Suspense fallback={<RepoCardContentSkeleton />}>
            <RepoCardContent repo={repo} />
          </Suspense>
        </CardContent>
      </Card>
    </Link>
  );
}
