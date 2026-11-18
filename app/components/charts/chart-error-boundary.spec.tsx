import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const refresh = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
  unstable_rethrow: () => {},
}));

import { ChartErrorBoundary } from "./chart-error-boundary";

let shouldFail = true;

function Flaky() {
  if (shouldFail) throw new Error("GitHub down");
  return <p>chart</p>;
}

describe("ChartErrorBoundary", () => {
  beforeEach(() => {
    shouldFail = true;
    refresh.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders its children when nothing fails", () => {
    shouldFail = false;
    render(
      <ChartErrorBoundary name="views">
        <Flaky />
      </ChartErrorBoundary>,
    );
    expect(screen.getByText("chart")).toBeTruthy();
  });

  it("shows the error and retries with a refresh", () => {
    render(
      <ChartErrorBoundary name="views">
        <Flaky />
      </ChartErrorBoundary>,
    );
    expect(screen.getByRole("alert").textContent).toBe("Couldn't load views.");

    shouldFail = false;
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(screen.getByText("chart")).toBeTruthy();
  });

  it("shows a compact mark with the error as its title", () => {
    render(
      <ChartErrorBoundary name="views" compact>
        <Flaky />
      </ChartErrorBoundary>,
    );
    const mark = screen.getByText("!");
    expect(mark.getAttribute("title")).toBe("Couldn't load views: GitHub down");
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("clears the error when its reset key changes", () => {
    const { rerender } = render(
      <ChartErrorBoundary name="views" compact resetKey={1}>
        <Flaky />
      </ChartErrorBoundary>,
    );
    shouldFail = false;
    rerender(
      <ChartErrorBoundary name="views" compact resetKey={2}>
        <Flaky />
      </ChartErrorBoundary>,
    );
    expect(screen.getByText("chart")).toBeTruthy();
  });
});
