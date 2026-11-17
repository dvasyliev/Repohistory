import { expect, test } from "@/tests/fixtures";

test("star history is public", async ({ page }) => {
  await page.goto("/star-history");

  await expect(page).toHaveURL("/star-history");
  await expect(
    page.getByRole("heading", { name: "Star History Chart Generator" }),
  ).toBeVisible();
  await expect(page.getByPlaceholder("facebook")).toBeVisible();
  await expect(page.getByRole("button", { name: "Generate" })).toBeVisible();
});
