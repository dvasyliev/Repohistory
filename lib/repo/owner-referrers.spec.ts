import { describe, expect, it } from "vitest";
import { referrers } from "@/lib/db/schema";
import { createTestDb } from "@/lib/db/test-db";
import type { Repo } from "@/lib/types";
import { getOwnerReferrers } from "./owner-referrers";

const day = (n: number) =>
  new Date(Date.now() - n * 86_400_000).toISOString().split("T")[0];

describe("getOwnerReferrers", () => {
  it("sums each referrer across repos per day, most visits first", async () => {
    const db = createTestDb();
    await db.insert(referrers).values([
      { repoId: 1, referrer: "google", date: day(1), total: 3, unique: 2 },
      { repoId: 2, referrer: "google", date: day(1), total: 4, unique: null },
      { repoId: 2, referrer: "bing", date: day(0), total: 1, unique: 1 },
    ]);
    const repos = [
      { id: 1, full_name: "o/a" },
      { id: 2, full_name: "o/b" },
    ] as Repo[];

    expect(await getOwnerReferrers(db, repos)).toEqual({
      referrers: [
        {
          referrer: "google",
          data: [
            { timestamp: day(1), count: 7, uniques: 2 },
            { timestamp: day(0), count: 0, uniques: null },
          ],
        },
        {
          referrer: "bing",
          data: [{ timestamp: day(0), count: 1, uniques: 1 }],
        },
      ],
    });
  });
});
