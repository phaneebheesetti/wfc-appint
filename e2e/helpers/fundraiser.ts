import { type Locator, type Page, expect } from "@playwright/test"

import { inviteSponsor } from "./sponsor"

const CAMPAIGN_DETAILS_URL_RE = /\/dashboard\/organizations\/[a-f0-9-]+\/campaigns\/[a-f0-9-]+/
const CAMPAIGN_ID_RE = /\/campaigns\/([a-f0-9-]+)/

function locators(page: Page) {
  return {
    addFundraiserButton: page.getByRole("button", { name: /add fundraiser/i }),
    dialog: page.getByRole("dialog"),
    successCreated: page.getByText("Fundraiser created successfully"),
  }
}

function getCampaignIdFromUrlOrThrow(page: Page): string {
  const url = page.url()
  const match = url.match(CAMPAIGN_ID_RE)
  if (!match?.[1]) throw new Error(`Could not extract campaign ID from URL: ${url}`)
  return match[1]
}

async function pickDate(page: Page, container: Locator, labelText: string, dayNumber: string) {
  const label = container.getByText(labelText, { exact: false })
  const input = label.locator("xpath=following::input[@readonly]").first()
  await input.click()

  const calendar = page.locator("[data-slot='calendar']")
  await expect(calendar).toBeVisible()

  await calendar
    .locator("td button")
    .filter({ hasText: new RegExp(`^${dayNumber}$`) })
    .first()
    .click()

  await expect(calendar).not.toBeVisible()
}

type CreateFundraiserOptions = {
  name?: string
  sponsorEmail: string
  casesBilled?: string
  startDay?: string
  endDay?: string
}

export async function createFundraiser(
  page: Page,
  options: CreateFundraiserOptions
): Promise<{ id: string; name: string }> {
  const name = options.name ?? `E2E Fundraiser ${Date.now()}`
  const casesBilled = options.casesBilled ?? "10"
  const startDay = options.startDay ?? "15"
  const endDay = options.endDay ?? "28"

  const ui = locators(page)

  await ui.addFundraiserButton.click()
  const modal = ui.dialog
  await expect(modal).toBeVisible()

  await modal.locator('input[name="name"]').fill(name)

  await pickDate(page, modal, "Start date", startDay)

  await pickDate(page, modal, "End date", endDay)

  await modal.locator('input[name="products.0.casesBilled"]').fill(casesBilled)

  await inviteSponsor(page, options.sponsorEmail, modal)

  await modal.locator('button[type="submit"]').click()

  await page.waitForURL(CAMPAIGN_DETAILS_URL_RE)
  await expect(ui.successCreated).toBeVisible({ timeout: 10000 })

  return { id: getCampaignIdFromUrlOrThrow(page), name }
}

export function getCampaignIdFromUrl(page: Page): string {
  return getCampaignIdFromUrlOrThrow(page)
}
