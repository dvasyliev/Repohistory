import { describe, expect, it } from "vitest";
import { cacheDay } from "./cache-day";

describe("cacheDay", () => {
  it("keeps the previous day until 01:00 UTC", () => {
    expect(cacheDay(new Date("2026-11-18T00:30:00Z"))).toBe("2026-11-17");
  });

  it("switches to the new day at 01:00 UTC", () => {
    expect(cacheDay(new Date("2026-11-18T01:00:00Z"))).toBe("2026-11-18");
  });
});
