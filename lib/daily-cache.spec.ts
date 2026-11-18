import { afterEach, describe, expect, it, vi } from "vitest";
import { dailyCache } from "./daily-cache";

function stubEdgeCache() {
  const store = new Map<string, Response>();
  const edge = {
    match: vi.fn((request: Request) =>
      Promise.resolve(store.get(request.url)?.clone()),
    ),
    put: vi.fn((request: Request, response: Response) => {
      store.set(request.url, response);
      return Promise.resolve();
    }),
  };
  vi.stubGlobal("caches", { default: edge });
  return edge;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("dailyCache", () => {
  it("answers from the edge cache on the same day", async () => {
    stubEdgeCache();
    const fn = vi.fn((owner: string) => Promise.resolve({ owner }));
    const cached = dailyCache("test", fn);

    expect(await cached("a")).toEqual({ owner: "a" });
    expect(await cached("a")).toEqual({ owner: "a" });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("asks again with other arguments or on the next cache day", async () => {
    stubEdgeCache();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-18T12:00:00Z"));
    const fn = vi.fn((owner: string) => Promise.resolve(owner));
    const cached = dailyCache("test", fn);

    await cached("a");
    await cached("b");
    vi.setSystemTime(new Date("2026-11-19T01:30:00Z"));
    await cached("a");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("does not store a failure", async () => {
    const edge = stubEdgeCache();
    const fn = vi
      .fn<() => Promise<number>>()
      .mockRejectedValueOnce(new Error("down"))
      .mockResolvedValueOnce(1);
    const cached = dailyCache("test", fn);

    await expect(cached()).rejects.toThrow("down");
    expect(edge.put).not.toHaveBeenCalled();
    expect(await cached()).toBe(1);
  });

  it("still answers when the edge cache fails", async () => {
    const edge = stubEdgeCache();
    edge.match.mockRejectedValue(new Error("cache down"));
    edge.put.mockRejectedValue(new Error("cache down"));
    const cached = dailyCache("test", () => Promise.resolve(7));

    expect(await cached()).toBe(7);
  });

  it("calls through without an edge cache", async () => {
    const fn = vi.fn(() => Promise.resolve(1));
    const cached = dailyCache("test", fn);

    await cached();
    await cached();
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
