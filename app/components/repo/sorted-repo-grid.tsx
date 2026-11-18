"use client";

import type { ReactNode } from "react";
import { useQueryState } from "nuqs";
import { repoSortParser } from "@/lib/repo/sort-query";
import { sortRepoIds, type RepoSortKeys } from "@/lib/repo/sort";

interface Props {
  cards: Record<number, ReactNode>;
  keys: RepoSortKeys[];
}

export function SortedRepoGrid({ cards, keys }: Props) {
  const [sort] = useQueryState("sort", repoSortParser);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
      {sortRepoIds(keys, sort).map((id) => (
        <div key={id} className="contents">
          {cards[id]}
        </div>
      ))}
    </div>
  );
}
