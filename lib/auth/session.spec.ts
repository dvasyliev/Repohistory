import { describe, expect, it } from "vitest";
import { isValidSession, sessionValue, verifyToken } from "./session";

describe("verifyToken", () => {
  it("accepts an equal token", async () => {
    expect(await verifyToken("secret", "secret")).toBe(true);
  });

  it("rejects a different token", async () => {
    expect(await verifyToken("other", "secret")).toBe(false);
  });

  it("rejects when the expected token is empty", async () => {
    expect(await verifyToken("", "")).toBe(false);
    expect(await verifyToken("secret", "")).toBe(false);
  });
});

describe("isValidSession", () => {
  it("accepts the value made from the same token", async () => {
    expect(await isValidSession(await sessionValue("secret"), "secret")).toBe(
      true,
    );
  });

  it("rejects a value made from another token", async () => {
    expect(await isValidSession(await sessionValue("old"), "secret")).toBe(
      false,
    );
  });

  it("rejects a missing or forged cookie", async () => {
    expect(await isValidSession(undefined, "secret")).toBe(false);
    expect(await isValidSession("forged", "secret")).toBe(false);
  });

  it("rejects everything when the site token is empty", async () => {
    expect(await isValidSession("anything", "")).toBe(false);
  });
});
