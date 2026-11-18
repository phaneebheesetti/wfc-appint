import { type Locator, type Page, expect } from "@playwright/test"

function locators(page: Page) {
  return {
    membersTab: page.getByRole("tab", { name: /members/i }),
    addMemberButton: page.getByRole("button", { name: /add member/i }),
    dialog: page.getByRole("dialog"),
    sheet: page.locator("[role='dialog']").filter({ hasText: "Organization Member" }),
    successInvitation: page.getByText("Invitation email sent"),
    successUpdated: page.getByText("Member updated successfully"),
    successRemoved: page.getByText("Member removed from organization successfully"),
  }
}

export async function navigateToMembersTab(page: Page) {
  const ui = locators(page)
  await ui.membersTab.click()
  await expect(ui.addMemberButton).toBeVisible()
}

type AddMemberOptions = {
  email: string
  role?: "Organization Admin" | "Organization Staff"
}

export async function addMember(page: Page, options: AddMemberOptions) {
  const ui = locators(page)

  await ui.addMemberButton.click()

  const modal = ui.dialog
  await expect(modal).toBeVisible()
  await expect(modal.getByText("Add Organization Member")).toBeVisible()

  await modal.locator('input[name="email"]').fill(options.email)

  if (options.role) {
    await modal.getByRole("combobox").click()
    await page.getByRole("option", { name: options.role }).click()
  }

  await modal.getByRole("button", { name: /send invitation/i }).click()

  await expect(modal).not.toBeVisible({ timeout: 15000 })
}

export async function viewMemberDetails(page: Page, memberText: string): Promise<Locator> {
  const row = page.getByRole("row").filter({ hasText: memberText })
  await row.locator("td:last-child").getByRole("button").click()

  const ui = locators(page)
  await expect(ui.sheet).toBeVisible()

  return ui.sheet
}

type EditMemberFields = Partial<Record<"firstName" | "lastName" | "phone", string>>

export async function editMember(page: Page, fields: EditMemberFields, sheet?: Locator) {
  const ui = locators(page)
  const container = sheet ?? ui.sheet

  await container.getByRole("button", { name: /edit/i }).click()

  for (const [name, value] of Object.entries(fields)) {
    if (value === undefined) continue
    await container.locator(`input[name="${name}"]`).fill(value)
  }

  await container.getByRole("button", { name: /save/i }).click()
  await expect(ui.successUpdated).toBeVisible({ timeout: 5000 })
}

export async function deleteMember(page: Page, sheet?: Locator) {
  const ui = locators(page)
  const container = sheet ?? ui.sheet

  await container.getByRole("button", { name: /delete/i }).click()

  const confirmDialog = page.getByRole("alertdialog")
  await expect(confirmDialog).toBeVisible()

  await confirmDialog.getByRole("button", { name: /remove/i }).click()

  await expect(ui.successRemoved).toBeVisible({ timeout: 5000 })
}
