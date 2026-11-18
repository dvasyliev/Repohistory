import { describe, expect, it } from "vitest";
import { stars } from "@/lib/db/schema";
import { createTestDb } from "@/lib/db/test-db";
import type { Repo } from "@/lib/types";
import { getOwnerStars } from "./owner-stars";

const day = (n: number) =>
  new Date(Date.now() - n * 86_400_000).toISOString().split("T")[0];

describe("getOwnerStars", () => {
  it("sums the repos' new stars per day", async () => {
    const db = createTestDb();
    await db.insert(stars).values([
      { repoId: 1, date: day(2), count: 2 },
      { repoId: 2, date: day(2), count: 1 },
      { repoId: 2, date: day(0), count: 4 },
    ]);
    const repos = [
      { id: 1, stargazers_count: 2 },
      { id: 2, stargazers_count: 5 },
    ] as Repo[];

    expect(await getOwnerStars(db, repos)).toEqual({
      totalStars: 7,
      starsHistory: [
        { date: day(2), daily: 3 },
        { date: day(0), daily: 4 },
      ],
    });
  });
});
