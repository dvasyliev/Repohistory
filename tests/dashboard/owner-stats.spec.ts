import { expect, test } from "@/tests/fixtures";

const TILES = ["Views", "Clones", "Stars", "Forks", "Commits", "Watchers"];

test("shows the owner's metric tiles and switches the big chart", async ({
  page,
}) => {
  await page.goto("/signin");
  await page.getByLabel("Site token").fill("e2e-token");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL("/");

  await page.goto("/dvasyliev");
  for (const tile of TILES) {
    await expect(
      page.getByRole("button", { name: new RegExp(`^${tile}`) }),
    ).toBeVisible({ timeout: 30_000 });
  }
  await expect(page.getByText("Repo Views", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: /^Stars/ }).click();
  await expect(page).toHaveURL(/chart=stars/);
  await expect(
    page.getByText("Stars Over Time", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Something went wrong")).toHaveCount(0);
});
