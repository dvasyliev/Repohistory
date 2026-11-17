import { expect, test } from "./fixtures";

// Starting point for generated end-to-end tests: opens the home page. Without
// a session it lands on the sign-in form. The fixture checks every page it
// opens for accessibility problems.
test("seed", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/signin$/);
  await expect(page.getByLabel("Site token")).toBeVisible();
});
