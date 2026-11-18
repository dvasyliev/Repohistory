import { describe, expect, it } from "vitest";
import { paths } from "@/lib/db/schema";
import { createTestDb } from "@/lib/db/test-db";
import type { Repo } from "@/lib/types";
import { getOwnerPaths } from "./owner-paths";

const day = (n: number) =>
  new Date(Date.now() - n * 86_400_000).toISOString().split("T")[0];

describe("getOwnerPaths", () => {
  it("names each path after its repo and keeps the ten most visited", async () => {
    const db = createTestDb();
    await db.insert(paths).values([
      { repoId: 1, path: "/", date: day(1), total: 50, unique: 5 },
      { repoId: 2, path: "/docs", date: day(0), total: 40, unique: null },
      ...Array.from({ length: 10 }, (_, i) => ({
        repoId: 2,
        path: `/p${i}`,
        date: day(0),
        total: 10 - i,
        unique: 1,
      })),
    ]);
    const repos = [
      { id: 1, full_name: "o/a" },
      { id: 2, full_name: "o/b" },
    ] as Repo[];

    const result = await getOwnerPaths(db, repos);

    expect(result.paths).toHaveLength(10);
    expect(result.paths[0]).toEqual({
      path: "a",
      title: "a",
      data: [
        { timestamp: day(1), count: 50, uniques: 5 },
        { timestamp: day(0), count: 0, uniques: null },
      ],
    });
    expect(result.paths[1]).toMatchObject({ path: "b/docs", title: "b/docs" });
    expect(result.paths.at(-1)).toMatchObject({ path: "b/p7" });
  });
});
