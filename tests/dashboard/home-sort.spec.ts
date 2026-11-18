import { expect, test } from "@/tests/fixtures";

test("sorts repos and keeps the sort across views", async ({ page }) => {
  await page.goto("/signin");
  await page.getByLabel("Site token").fill("e2e-token");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL("/");

  const titles = page.locator("a[href^='/'] [data-slot='card-title']");
  await expect(titles.first()).toBeVisible();

  await page.getByLabel("Sort by").selectOption({ label: "Name" });
  await expect(page).toHaveURL(/sort=name/);
  const names = await titles.allTextContents();
  expect(names.length).toBeGreaterThan(0);
  expect(names[0]).toBe(
    [...names].sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" }),
    )[0],
  );

  await page.getByLabel("Sort by").selectOption({ label: "Stars" });
  await expect(page).toHaveURL(/sort=stars/);
  await page.getByRole("tab", { name: "Owners", exact: true }).click();
  await expect(page).toHaveURL(/view=owners/);
  await expect(page).toHaveURL(/sort=stars/);
  await page.getByRole("tab", { name: "Repos", exact: true }).click();
  await expect(page).toHaveURL(/sort=stars/);
  await expect(page.getByLabel("Sort by")).toHaveValue("stars");
});
