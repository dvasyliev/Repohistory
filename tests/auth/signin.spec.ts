import { expect, test } from "@/tests/fixtures";

test("signs in with the right token", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/signin$/);

  await page.getByLabel("Site token").fill("e2e-token");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();

  await expect(page).toHaveURL("/");
  await expect(
    page.getByRole("tab", { name: "Repos", exact: true }),
  ).toBeVisible();
});

test("shows an error for a wrong token", async ({ page }) => {
  await page.goto("/signin");

  await page.getByLabel("Site token").fill("wrong");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();

  await expect(
    page.getByRole("alert").filter({ hasText: "Wrong token" }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/signin$/);
});
