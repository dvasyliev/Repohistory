"use client";

import { useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { Button } from "@/app/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useQueryState } from "nuqs";
import { repoSortParser } from "@/lib/repo/sort-query";
import type { RepoSort } from "@/lib/repo/sort";

const SORT_LABELS: Record<RepoSort, string> = {
  views: "Views (14d)",
  stars: "Stars",
  forks: "Forks",
  activity: "Last activity",
  name: "Name",
};
const SORT_OPTIONS = Object.entries(SORT_LABELS) as [RepoSort, string][];

const appSlug = process.env.NEXT_PUBLIC_GITHUB_APP_SLUG;

export function DashboardHeader() {
  const searchParams = useSearchParams();
  const viewMode = searchParams.get("view") === "owners" ? "owners" : "repos";

  const [sort, setSort] = useQueryState("sort", repoSortParser);

  const handleViewChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", value);
    window.history.pushState(null, "", `?${params.toString()}`);
  };

  return (
    <div className="flex items-center justify-between">
      <Tabs value={viewMode} onValueChange={handleViewChange}>
        <TabsList>
          <TabsTrigger value="repos">Repos</TabsTrigger>
          <TabsTrigger value="owners">Owners</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="flex items-center gap-3">
        {viewMode === "repos" && (
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            Sort by
            <select
              value={sort}
              onChange={(event) => {
                const next = SORT_OPTIONS.find(
                  ([value]) => value === event.target.value,
                );
                if (next) void setSort(next[0]);
              }}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground"
            >
              {SORT_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        )}
        {appSlug && (
          <Link
            href={`https://github.com/apps/${appSlug}/installations/new`}
            rel="noopener noreferrer"
          >
            <Button variant="secondary">
              <Plus className="h-4 w-4" />
              Add Repos
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
