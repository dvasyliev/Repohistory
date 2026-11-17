import { describe, expect, it, vi } from "vitest";
import type { Db } from "./client";
import { getDailyHistoryForRepos } from "./traffic";

function fakeDb(onWhere: (params: unknown) => void) {
  const chain = {
    from: () => chain,
    where: (condition: unknown) => {
      onWhere(condition);
      return chain;
    },
    orderBy: () => Promise.resolve([]),
  };
  return { select: () => chain } as unknown as Db;
}

describe("getDailyHistoryForRepos", () => {
  it("splits more than 90 repo ids into several queries", async () => {
    const where = vi.fn();
    const ids = Array.from({ length: 200 }, (_, i) => i + 1);
    await getDailyHistoryForRepos(fakeDb(where), "views", ids);
    expect(where).toHaveBeenCalledTimes(3);
  });

  it("does not query without repo ids", async () => {
    const where = vi.fn();
    await getDailyHistoryForRepos(fakeDb(where), "views", []);
    expect(where).not.toHaveBeenCalled();
  });
});
