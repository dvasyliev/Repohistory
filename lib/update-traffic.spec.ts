import type { App } from "octokit";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "@/lib/db/client";
import { upsertTraffic } from "@/lib/traffic-rows";
import { updateTraffic } from "./update-traffic";

vi.mock("@/lib/traffic-rows", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  upsertTraffic: vi.fn(),
}));

const repository = {
  id: 7,
  name: "repo",
  full_name: "owner/repo",
  owner: { login: "owner" },
};

function fakeApp(request: () => Promise<unknown>): App {
  const rest = {
    repos: {
      getViews: () =>
        Promise.resolve({
          data: {
            views: [
              { timestamp: "2026-11-01T00:00:00Z", count: 3, uniques: 2 },
            ],
          },
        }),
      getClones: () => Promise.resolve({ data: { clones: [] } }),
      getTopPaths: () => Promise.resolve({ data: [] }),
      getTopReferrers: () => Promise.resolve({ data: [] }),
    },
  };
  return {
    getInstallationOctokit: () => Promise.resolve({ rest, request }),
    eachRepository: (
      _: unknown,
      callback: (item: { repository: typeof repository }) => Promise<void>,
    ) => callback({ repository }),
  } as unknown as App;
}

describe("updateTraffic", () => {
  beforeEach(() => {
    vi.mocked(upsertTraffic).mockReset();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("keeps stored stars and logs when the star fetch fails", async () => {
    const app = fakeApp(() => Promise.reject(new Error("boom")));
    await updateTraffic(app, 1, {} as Db);

    expect(console.error).toHaveBeenCalledWith(
      "owner/repo",
      "stars error",
      "boom",
    );
    const [, rows] = vi.mocked(upsertTraffic).mock.calls[0];
    expect(rows.views).toEqual([
      { repoId: 7, date: "2026-11-01", total: 3, unique: 2 },
    ]);
    expect(rows.stars).toBeUndefined();
  });

  it("replaces the repo's stars when the star fetch succeeds", async () => {
    const app = fakeApp(() => Promise.resolve({ data: [] }));
    await updateTraffic(app, 1, {} as Db);

    const [, rows] = vi.mocked(upsertTraffic).mock.calls[0];
    expect(rows.stars).toEqual({ repoId: 7, rows: [] });
  });
});
