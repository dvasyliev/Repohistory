import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { queryD1 } from "./http";

const config = { accountId: "acc", databaseId: "db", apiToken: "secret-token" };

type Fetch = typeof globalThis.fetch;

function ok(results: unknown[] = []) {
  return new Response(
    JSON.stringify({
      success: true,
      errors: [],
      result: [{ results, success: true, meta: {} }],
    }),
    { status: 200 },
  );
}

function failure(status: number, message: string, headers?: HeadersInit) {
  return new Response(
    JSON.stringify({
      success: false,
      errors: [{ code: 1, message }],
      result: [],
    }),
    { status, headers },
  );
}

describe("queryD1", () => {
  const sleep = vi.fn<(ms: number) => Promise<void>>();
  const statements = [{ sql: "select ?", params: [1] }];
  const run = (fetchMock: ReturnType<typeof vi.fn<Fetch>>, sql = statements) =>
    queryD1({ ...config, fetch: fetchMock, sleep }, sql);

  beforeEach(() => {
    sleep.mockReset();
    sleep.mockResolvedValue(undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("retries a 503 and returns the second answer", async () => {
    const fetchMock = vi
      .fn<Fetch>()
      .mockResolvedValueOnce(failure(503, "unavailable"))
      .mockResolvedValueOnce(ok([{ a: 1 }]));

    const result = await run(fetchMock);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result[0].results).toEqual([{ a: 1 }]);
    expect(sleep).toHaveBeenCalledTimes(1);
  });

  it("does not retry a 400", async () => {
    const fetchMock = vi.fn<Fetch>().mockResolvedValue(failure(400, "bad sql"));

    await expect(run(fetchMock)).rejects.toThrow("bad sql");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("gives up after 3 tries on 429", async () => {
    const fetchMock = vi
      .fn<Fetch>()
      .mockImplementation(() => Promise.resolve(failure(429, "slow down")));

    await expect(run(fetchMock)).rejects.toThrow("slow down");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("fails at once when Retry-After is 120", async () => {
    const fetchMock = vi
      .fn<Fetch>()
      .mockResolvedValue(failure(429, "slow down", { "Retry-After": "120" }));

    await expect(run(fetchMock)).rejects.toThrow("slow down");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries a network error", async () => {
    const fetchMock = vi
      .fn<Fetch>()
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(ok());

    await run(fetchMock);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("sends sql and params to the query endpoint with the bearer token", async () => {
    const fetchMock = vi.fn<Fetch>().mockResolvedValue(ok());

    await run(fetchMock);

    const [url, init] = fetchMock.mock.calls[0];
    const headers = init?.headers as Record<string, string>;
    expect(url).toBe(
      "https://api.cloudflare.com/client/v4/accounts/acc/d1/database/db/query",
    );
    expect(init?.method).toBe("POST");
    expect(headers.Authorization).toBe("Bearer secret-token");
    expect(JSON.parse(init?.body as string)).toEqual({
      sql: "select ?",
      params: [1],
    });
  });

  it("sends several statements as one batch", async () => {
    const fetchMock = vi.fn<Fetch>().mockResolvedValue(ok());
    const many = [...statements, { sql: "select 2", params: [] }];

    await run(fetchMock, many);

    expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string)).toEqual({
      batch: many,
    });
  });

  it("logs the status and never the token", async () => {
    const fetchMock = vi.fn<Fetch>().mockResolvedValue(failure(400, "bad sql"));

    await expect(run(fetchMock)).rejects.toThrow();

    const logged = JSON.stringify(vi.mocked(console.error).mock.calls);
    expect(logged).toContain("400");
    expect(logged).not.toContain("secret-token");
  });
});
