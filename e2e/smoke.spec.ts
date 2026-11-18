import { clerk } from "@clerk/testing/playwright"
import { expect, test } from "@playwright/test"

import { RolesEnum } from "@/constants/roles"

import { testUsersByRole } from "./auth.setup"

const wfcAdmin = testUsersByRole[RolesEnum.WFC_ADMIN]
if (!wfcAdmin) {
  throw new Error("WFC admin test user is not defined in testUsersByRole")
}

test.describe("Smoke", () => {
  test("app is reachable at root", async ({ page }) => {
    const baseURL = process.env.APP_URL ?? "http://localhost:3000"

    await page.goto("/")

    await expect(page).toHaveURL(new RegExp(`^${baseURL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\/?$`))
    await expect(page.getByRole("link", { name: "Terms of Service" }).first()).toBeVisible({ timeout: 15_000 })
  })

  test("sign in with WFC admin and reach dashboard", async ({ page }) => {
    await page.goto("/")

    await expect(page.getByTestId("home-sign-in")).toBeVisible()

    await clerk.signIn({
      page,
      signInParams: {
        strategy: "email_code",
        identifier: wfcAdmin.email,
      },
    })

    await expect(page.getByTestId("home-go-to-dashboard")).toBeVisible()

    await page.goto("/dashboard")

    await expect(page.getByTestId("sidebar-footer-menu")).toBeVisible()
  })
})
