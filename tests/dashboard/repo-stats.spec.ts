import { expect, test } from "@/tests/fixtures";

test("shows the forks, counters and commit charts on the repo page", async ({
  page,
}) => {
  await page.goto("/signin");
  await page.getByLabel("Site token").fill("e2e-token");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL("/");

  await page
    .getByRole("link", { name: /react-crash-course/ })
    .first()
    .click();
  await expect(page).toHaveURL("/dvasyliev/react-crash-course");

  await expect(
    page.getByText("Forks Over Time", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Repository Counters", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Commit Activity", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Something went wrong")).toHaveCount(0);
});
