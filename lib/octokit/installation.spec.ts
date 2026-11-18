import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react", async (importOriginal) => {
  const actual: Record<string, unknown> = await importOriginal();
  return { ...actual, cache: <T>(fn: T) => fn };
});

const notFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});
vi.mock("next/cache", () => ({
  unstable_cache: <T>(fn: () => Promise<T>) => fn,
}));

vi.mock("next/navigation", () => ({ notFound: () => notFound() }));

const listInstallations = vi.fn();
const eachInstallation = vi.fn();
const eachRepository = vi.fn();
vi.mock("@/lib/octokit/app", () => ({
  getApp: () => ({
    octokit: { rest: { apps: { listInstallations } } },
    eachInstallation,
    eachRepository,
  }),
}));

import { getInstallationId as find } from "./installation";
import { getRepos } from "./get-repos";

const installations = [
  { id: 1, account: { login: "Alice" }, suspended_at: null },
  { id: 2, account: { login: "bob" }, suspended_at: "2026-01-01T00:00:00Z" },
];

beforeEach(() => {
  vi.clearAllMocks();
  listInstallations.mockResolvedValue({ data: installations });
});

describe("getInstallationId", () => {
  it("matches the owner case-insensitively", async () => {
    expect(await find("alice")).toBe(1);
  });

  it("skips suspended installations", async () => {
    await expect(find("bob")).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("calls notFound for an unknown owner", async () => {
    await expect(find("carol")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalled();
  });
});

describe("getRepos", () => {
  it("skips suspended installations", async () => {
    eachInstallation.mockImplementation(
      async (cb: (arg: { installation: unknown }) => Promise<void>) => {
        for (const installation of installations) await cb({ installation });
      },
    );
    eachRepository.mockImplementation(
      async (
        { installationId }: { installationId: number },
        cb: (arg: { repository: unknown }) => Promise<void>,
      ) => {
        await cb({
          repository: { id: installationId, full_name: `x/${installationId}` },
        });
      },
    );

    const result = await getRepos();

    expect(result.repos.map((r) => r.id)).toEqual([1]);
    expect(Object.keys(result.reposByOwner)).toEqual(["Alice"]);
    expect(result.shouldShowOwnerView).toBe(false);
  });
});
