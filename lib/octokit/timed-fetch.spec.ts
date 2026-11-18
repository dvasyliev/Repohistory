import { afterEach, describe, expect, it, vi } from "vitest";
import { timedFetch } from "./timed-fetch";

describe("timedFetch", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("passes a normal response through", async () => {
    const response = new Response("ok", { status: 200 });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
    await expect(timedFetch("https://api.github.com/app")).resolves.toBe(
      response,
    );
  });

  it("rejects when the request takes longer than the limit", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener("abort", () =>
              reject(new Error("aborted")),
            );
          }),
      ),
    );
    await expect(
      timedFetch("https://api.github.com/app", undefined, 20),
    ).rejects.toThrow();
    expect(console.error).toHaveBeenCalled();
  });
});
