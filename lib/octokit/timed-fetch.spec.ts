import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { timedFetch } from "./timed-fetch";

const url = "https://api.github.com/app";

describe("timedFetch", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("passes a normal response through", async () => {
    const response = new Response("ok", { status: 200 });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
    await expect(timedFetch(url)).resolves.toBe(response);
  });

  it("rejects when the request takes longer than the limit", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener("abort", () =>
              reject(new DOMException("timed out", "TimeoutError")),
            );
          }),
      ),
    );
    await expect(timedFetch(url, undefined, 20)).rejects.toThrow();
    expect(console.error).toHaveBeenCalled();
  });

  it("retries a 503 once and returns the next response", async () => {
    vi.useFakeTimers();
    const ok = new Response("ok", { status: 200 });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("", { status: 503 }))
      .mockResolvedValueOnce(ok);
    vi.stubGlobal("fetch", fetchMock);
    const result = timedFetch(url);
    await vi.advanceTimersByTimeAsync(750);
    await expect(result).resolves.toBe(ok);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("makes two tries at most", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(new Response("", { status: 502 })),
      );
    vi.stubGlobal("fetch", fetchMock);
    const result = timedFetch(url);
    await vi.advanceTimersByTimeAsync(750);
    expect((await result).status).toBe(502);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries a network error", async () => {
    vi.useFakeTimers();
    const ok = new Response("ok", { status: 200 });
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(ok);
    vi.stubGlobal("fetch", fetchMock);
    const result = timedFetch(url);
    await vi.advanceTimersByTimeAsync(750);
    await expect(result).resolves.toBe(ok);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry a 404", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("", { status: 404 }));
    vi.stubGlobal("fetch", fetchMock);
    expect((await timedFetch(url)).status).toBe(404);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not retry a POST", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("", { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);
    expect((await timedFetch(url, { method: "POST" })).status).toBe(503);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("fails at once when Retry-After is longer than 5 seconds", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response("", { status: 429, headers: { "Retry-After": "30" } }),
      );
    vi.stubGlobal("fetch", fetchMock);
    expect((await timedFetch(url)).status).toBe(429);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("waits for a short Retry-After before the retry", async () => {
    vi.useFakeTimers();
    const ok = new Response("ok", { status: 200 });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response("", { status: 429, headers: { "Retry-After": "2" } }),
      )
      .mockResolvedValueOnce(ok);
    vi.stubGlobal("fetch", fetchMock);
    const result = timedFetch(url);
    await vi.advanceTimersByTimeAsync(1_999);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    await expect(result).resolves.toBe(ok);
  });
});
