import { clerk } from "@clerk/testing/playwright"
import { test as setup } from "@playwright/test"

import { testUsers } from "./auth.setup"

const ROLE_TO_FILENAME: Record<string, string> = {
  wfc_admin: "wfc-admin",
  sales_manager: "sales-manager",
  sales_representative: "sales-representative",
  organization_admin: "organization-admin",
  organization_staff: "organization-staff",
  parent: "parent",
  participant: "participant",
}

for (const user of testUsers) {
  const filename = ROLE_TO_FILENAME[user.role]
  if (!filename) continue

  setup(`authenticate as ${user.role}`, async ({ page }) => {
    await page.goto("/")
    await clerk.signIn({
      page,
      signInParams: {
        strategy: "email_code",
        identifier: user.email,
      },
    })
    await page.goto("/dashboard")
    await page.waitForURL(/\/dashboard/)
    await page.context().storageState({ path: `.auth/${filename}.json` })
  })
}
