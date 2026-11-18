import { type Locator, type Page, expect } from "@playwright/test"

const ORG_LIST_URL = "/dashboard/organizations"
const ORG_DETAILS_URL_RE = /\/dashboard\/organizations\/[a-f0-9-]+/
const ORG_ID_RE = /\/dashboard\/organizations\/([a-f0-9-]+)/

function locators(page: Page) {
  return {
    header: page.getByText("View, create and manage organizations"),
    addOrgButton: page.getByRole("button", { name: /add organization/i }),
    dialog: page.getByRole("dialog"),
    successCreated: page.getByText("Organization created successfully"),
    successUpdated: page.getByText("Organization updated successfully"),
  }
}

async function ensureOrganizationsList(page: Page) {
  if (!page.url().includes(ORG_LIST_URL)) {
    await page.goto(ORG_LIST_URL)
  }
  await expect(locators(page).header).toBeVisible()
}

function getOrganizationIdFromUrlOrThrow(page: Page): string {
  const url = page.url()
  const match = url.match(ORG_ID_RE)
  if (!match?.[1]) throw new Error(`Could not extract organization ID from URL: ${url}`)
  return match[1]
}

async function fillOrgForm(container: Locator, fields: Record<string, string>) {
  for (const [name, value] of Object.entries(fields)) {
    await container.locator(`input[name="${name}"]`).fill(value)
  }
}

export async function createOrganization(page: Page, name = "E2E Test Org") {
  await ensureOrganizationsList(page)

  const ui = locators(page)
  await ui.addOrgButton.click()

  const modal = ui.dialog
  await expect(modal).toBeVisible()

  await fillOrgForm(modal, {
    name,
    street: "123 Test St",
    city: "Chicago",
    postalCode: "60601",
    state: "IL",
  })

  await modal.locator('button[type="submit"]').click()

  await page.waitForURL(ORG_DETAILS_URL_RE)
  await expect(ui.successCreated).toBeVisible({ timeout: 5000 })

  return { id: getOrganizationIdFromUrlOrThrow(page), name }
}

export async function listOrganizations(page: Page) {
  await ensureOrganizationsList(page)
}

export async function viewOrganizationDetails(page: Page, orgName: string) {
  await ensureOrganizationsList(page)

  await page.getByPlaceholder("Search by Name").fill(orgName)

  const row = page.getByRole("row").filter({ hasText: orgName })
  await row.getByRole("link", { name: /view/i }).click()

  await page.waitForURL(ORG_DETAILS_URL_RE)
  return { id: getOrganizationIdFromUrlOrThrow(page), name: orgName }
}

export async function openOrganizationSettings(page: Page) {
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" })
  const settingsButton = page.getByRole("button", { name: /organization settings/i })
  await expect(settingsButton).toBeVisible({ timeout: 10000 })
  await settingsButton.click()

  const dialog = locators(page).dialog
  await expect(dialog).toBeVisible({ timeout: 10000 })

  return dialog
}

type EditableFields = Partial<Record<"name" | "street" | "city" | "postalCode" | "state", string>>

export async function editOrganization(page: Page, fields: EditableFields, dialog?: Locator) {
  const ui = locators(page)
  const sheet = dialog ?? ui.dialog

  await sheet.getByRole("button", { name: /edit/i }).click()

  for (const [field, value] of Object.entries(fields)) {
    if (value === undefined) continue
    await sheet.locator(`input[name="${field}"]`).fill(value)
  }

  await sheet.getByRole("button", { name: /save/i }).click()
  await expect(ui.successUpdated).toBeVisible({ timeout: 5000 })
}

export function getOrganizationIdFromUrl(page: Page): string {
  return getOrganizationIdFromUrlOrThrow(page)
}
