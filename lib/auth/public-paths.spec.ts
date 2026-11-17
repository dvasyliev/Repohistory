import { describe, expect, it } from "vitest";
import { isPublicPath } from "./public-paths";

describe("isPublicPath", () => {
  it.each([
    "/signin",
    "/star-history",
    "/star-history/owner/repo",
    "/api/svg",
    "/icons/general.png",
    "/favicon.ico",
    "/chart1.png",
  ])("allows %s", (path) => {
    expect(isPublicPath(path)).toBe(true);
  });

  it.each([
    "/",
    "/api/export/1.json",
    "/o/next.js",
    "/o/logo.png",
    "/owner/repo.svg",
    "/star-historyX",
    "/api/svgfoo",
    "/signinx",
    "/favicon.icox/repo",
    "/iconsx/a.txt",
  ])("protects %s", (path) => {
    expect(isPublicPath(path)).toBe(false);
  });
});
