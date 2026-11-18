import { afterEach, describe, expect, it, vi } from "vitest";
import { getBase64Image } from "./star-utils";

describe("getBase64Image", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns a data URL with a time limit on the request", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response("img", { headers: { "content-type": "image/png" } }),
      );
    vi.stubGlobal("fetch", fetchMock);
    expect(await getBase64Image("https://avatars.example/u")).toBe(
      `data:image/png;base64,${Buffer.from("img").toString("base64")}`,
    );
    expect(fetchMock.mock.calls[0][1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it("throws when the response is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("", { status: 404 })),
    );
    await expect(getBase64Image("https://avatars.example/u")).rejects.toThrow(
      "404",
    );
  });
});
