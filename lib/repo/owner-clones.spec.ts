import { describe, expect, it } from "vitest";
import { clones } from "@/lib/db/schema";
import { createTestDb } from "@/lib/db/test-db";
import type { Repo } from "@/lib/types";
import { getOwnerClones } from "./owner-clones";

const day = (n: number) =>
  new Date(Date.now() - n * 86_400_000).toISOString().split("T")[0];

describe("getOwnerClones", () => {
  it("sums the repos' clones per day up to yesterday", async () => {
    const db = createTestDb();
    await db.insert(clones).values([
      { repoId: 1, date: day(2), total: 3, unique: 1 },
      { repoId: 2, date: day(2), total: 2, unique: 2 },
      { repoId: 2, date: day(0), total: 9, unique: 9 },
    ]);
    const repos = [
      { id: 1, full_name: "o/a" },
      { id: 2, full_name: "o/b" },
    ] as Repo[];

    expect(await getOwnerClones(db, repos)).toEqual({
      count: 5,
      uniques: 3,
      clones: [
        { timestamp: day(2), count: 5, uniques: 3 },
        { timestamp: day(1), count: 0, uniques: 0 },
      ],
    });
  });
});
