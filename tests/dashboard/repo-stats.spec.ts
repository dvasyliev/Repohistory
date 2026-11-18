import { expect, test } from "@/tests/fixtures";

const TILES = ["Views", "Clones", "Stars", "Forks", "Commits", "Watchers"];

test("switches the big chart from the metric tiles", async ({ page }) => {
  await page.goto("/signin");
  await page.getByLabel("Site token").fill("e2e-token");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL("/");

  await page
    .getByRole("link", { name: /react-crash-course/ })
    .first()
    .click();
  await expect(page).toHaveURL("/dvasyliev/react-crash-course");

  for (const tile of TILES) {
    await expect(
      page.getByRole("button", { name: new RegExp(`^${tile}`) }),
    ).toBeVisible();
  }
  await expect(page.getByText("Repo Views", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: /^Forks/ }).click();
  await expect(page).toHaveURL(/chart=forks/);
  await expect(
    page.getByText("Forks Over Time", { exact: true }),
  ).toBeVisible();

  await page.getByRole("button", { name: /^Commits/ }).click();
  await expect(
    page.getByText("Commit Activity", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Something went wrong")).toHaveCount(0);
});
