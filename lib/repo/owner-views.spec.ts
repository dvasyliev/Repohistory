import { describe, expect, it } from "vitest";
import { views } from "@/lib/db/schema";
import { createTestDb } from "@/lib/db/test-db";
import { getDailyHistory } from "@/lib/db/traffic";
import type { Repo } from "@/lib/types";
import { getOwnerViews } from "./owner-views";
import { getRepoViews } from "./views";

function daysAgo(n: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().split("T")[0];
}

describe("getOwnerViews", () => {
  it("sums the repos' views per day as the per-repo series do", async () => {
    const db = createTestDb();
    await db.insert(views).values([
      { repoId: 1, date: daysAgo(5), total: 2, unique: 1 },
      { repoId: 1, date: daysAgo(1), total: 4, unique: 2 },
      { repoId: 2, date: daysAgo(3), total: 5, unique: 5 },
      { repoId: 2, date: daysAgo(1), total: 1, unique: 1 },
      { repoId: 2, date: daysAgo(0), total: 8, unique: 8 },
    ]);
    const repos = [
      { id: 1, full_name: "o/a" },
      { id: 2, full_name: "o/b" },
    ] as Repo[];

    const perRepo = await Promise.all(
      repos.map(async (repo) =>
        getRepoViews(
          null,
          db,
          repo.full_name,
          repo.id,
          await getDailyHistory(db, "views", repo.id),
        ),
      ),
    );
    const byDay = new Map<string, { count: number; uniques: number }>();
    for (const { views: days } of perRepo) {
      for (const { timestamp, count, uniques } of days) {
        const day = byDay.get(timestamp) ?? { count: 0, uniques: 0 };
        byDay.set(timestamp, {
          count: day.count + count,
          uniques: day.uniques + uniques,
        });
      }
    }

    const result = await getOwnerViews(db, repos);

    expect(result.views).toEqual(
      [...byDay.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([timestamp, day]) => ({ timestamp, ...day })),
    );
    expect(result.views).toHaveLength(5);
    expect(result.views.at(-1)).toEqual({
      timestamp: daysAgo(1),
      count: 5,
      uniques: 3,
    });
    expect(result.count).toBe(12);
    expect(result.uniques).toBe(9);
  });
});
