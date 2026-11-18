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

function fakeApp(request: (route: string) => Promise<unknown>): App {
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

const repoData = {
  id: 7,
  stargazers_count: 5,
  forks_count: 2,
  subscribers_count: 3,
  open_issues_count: 1,
};

function route(overrides: Record<string, () => Promise<unknown>> = {}) {
  return (path: string) => {
    if (overrides[path]) return overrides[path]();
    if (path === "GET /repos/{owner}/{repo}")
      return Promise.resolve({ status: 200, data: repoData });
    if (path.includes("/stats/"))
      return Promise.resolve({ status: 200, data: [] });
    return Promise.resolve({ status: 200, data: [] });
  };
}

describe("updateTraffic", () => {
  beforeEach(() => {
    vi.mocked(upsertTraffic).mockReset();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("keeps stored stars and logs when the star fetch fails", async () => {
    const app = fakeApp(
      route({
        "GET /repos/{owner}/{repo}/stargazers/history": () =>
          Promise.reject(new Error("boom")),
      }),
    );
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
    const app = fakeApp(route());
    await updateTraffic(app, 1, {} as Db);

    const [, rows] = vi.mocked(upsertTraffic).mock.calls[0];
    expect(rows.stars).toEqual({ repoId: 7, rows: [] });
    expect(rows.forks).toEqual({ repoId: 7, rows: [] });
    expect(rows.counters).toEqual([
      {
        repoId: 7,
        date: new Date().toISOString().slice(0, 10),
        stars: 5,
        forks: 2,
        watchers: 3,
      },
    ]);
  });

  it("skips forks and logs when the forks fetch fails", async () => {
    const app = fakeApp(
      route({
        "GET /repos/{owner}/{repo}/forks": () =>
          Promise.reject(new Error("nope")),
      }),
    );
    await updateTraffic(app, 1, {} as Db);

    expect(console.error).toHaveBeenCalledWith(
      "owner/repo",
      "forks error",
      "nope",
    );
    const [, rows] = vi.mocked(upsertTraffic).mock.calls[0];
    expect(rows.views).toHaveLength(1);
    expect(rows.forks).toBeUndefined();
  });

  it("skips counters and logs when the repo fetch fails", async () => {
    const app = fakeApp(
      route({
        "GET /repos/{owner}/{repo}": () => Promise.reject(new Error("bad")),
      }),
    );
    await updateTraffic(app, 1, {} as Db);

    expect(console.error).toHaveBeenCalledWith(
      "owner/repo",
      "counters error",
      "bad",
    );
    const [, rows] = vi.mocked(upsertTraffic).mock.calls[0];
    expect(rows.counters).toBeUndefined();
  });
});
