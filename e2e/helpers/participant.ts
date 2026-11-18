import { type Locator, type Page, expect } from "@playwright/test"

function locators(page: Page) {
  return {
    participantsTab: page.getByRole("tab", { name: /participants/i }),
    addParticipantButton: page.getByRole("button", { name: /add participant/i }),
    dialog: page.getByRole("dialog"),
    sheet: page.locator("[role='dialog']").filter({ hasText: "Fundraiser Participant" }),
    successAdded: page.getByText("Participant added successfully"),
    successRemoved: page.getByText("Participant removed from fundraiser successfully"),
  }
}

export async function navigateToFundraiserParticipants(page: Page) {
  const ui = locators(page)
  await ui.participantsTab.click()
  await expect(ui.addParticipantButton).toBeVisible()
}

type AddParticipantOptions = {
  firstName: string
  lastName: string
  grade: string
  teacherName: string
  parentEmail?: string
  eligible?: boolean
}

export async function addParticipant(page: Page, options: AddParticipantOptions) {
  const ui = locators(page)

  await ui.addParticipantButton.click()

  const modal = ui.dialog
  await expect(modal).toBeVisible()
  await expect(modal.getByText("Add participant(s)", { exact: true })).toBeVisible()

  await modal.getByText("Add New").click()
  await expect(modal.getByText("Add individual participant")).toBeVisible()

  await modal.locator('input[name="firstName"]').fill(options.firstName)
  await modal.locator('input[name="lastName"]').fill(options.lastName)
  await modal.locator('input[name="grade"]').fill(options.grade)
  await modal.locator('input[name="teacherName"]').fill(options.teacherName)

  if (options.parentEmail) {
    await modal.locator('input[name="parentEmail"]').fill(options.parentEmail)
  }

  if (options.eligible === false) {
    await modal.getByRole("checkbox", { name: /eligible/i }).uncheck()
  }

  await modal.getByRole("button", { name: /^add$/i }).click()

  await expect(ui.successAdded).toBeVisible({ timeout: 10000 })
  await expect(modal).not.toBeVisible({ timeout: 5000 })
}

export async function viewParticipantDetails(page: Page, participantText: string): Promise<Locator> {
  const row = page.getByRole("row").filter({ hasText: participantText })
  await row.locator("td:last-child").getByRole("button").last().click()

  const ui = locators(page)
  await expect(ui.sheet).toBeVisible()

  return ui.sheet
}

type EditParticipantFields = Partial<Record<"firstName" | "lastName" | "grade" | "teacherName" | "parentEmail", string>>

export async function editParticipant(page: Page, fields: EditParticipantFields, sheet?: Locator) {
  const ui = locators(page)
  const container = sheet ?? ui.sheet

  await container.getByRole("button", { name: /edit/i }).click()

  for (const [name, value] of Object.entries(fields)) {
    if (value === undefined) continue
    await container.locator(`input[name="${name}"]`).fill(value)
  }

  await container.getByRole("button", { name: /save/i }).click()
  await expect(container).not.toBeVisible({ timeout: 10000 })
}

export async function deleteParticipant(page: Page, sheet?: Locator) {
  const ui = locators(page)
  const container = sheet ?? ui.sheet

  await container.getByRole("button", { name: /remove/i }).click()

  const confirmDialog = page.getByRole("alertdialog")
  await expect(confirmDialog).toBeVisible()

  await confirmDialog.getByRole("button", { name: /remove/i }).click()

  await expect(ui.successRemoved).toBeVisible({ timeout: 5000 })
}
