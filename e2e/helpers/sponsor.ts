import { type Locator, type Page, expect } from "@playwright/test"

export async function inviteSponsor(page: Page, email: string, parentDialog: Locator): Promise<void> {
  const sponsorLabel = parentDialog.getByText("Sponsor", { exact: false })
  await sponsorLabel.locator('xpath=following::*[@role="combobox"]').first().click()
  await page.getByRole("option", { name: /invite new sponsor/i }).click()

  const inviteDialog = page.getByRole("dialog").filter({ has: page.locator('input[name="email"]') })
  await expect(inviteDialog).toBeVisible()

  await inviteDialog.locator('input[name="email"]').fill(email)

  await inviteDialog.getByRole("button", { name: /send invitation/i }).click()

  await expect(inviteDialog).not.toBeVisible({ timeout: 15000 })
}
