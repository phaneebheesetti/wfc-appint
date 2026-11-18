import { type Page, expect } from "@playwright/test"

function locators(page: Page) {
  return {
    communicationsTab: page.getByRole("tab", { name: /communications/i }),
    createMessageButton: page.getByRole("button", { name: /create message/i }),
    dialog: page.getByRole("dialog"),
  }
}

export async function navigateToCommunications(page: Page) {
  const ui = locators(page)
  await ui.communicationsTab.click()
  await expect(ui.createMessageButton).toBeVisible()
}

type CreateMessageOptions = {
  subject: string
  message: string
  includeLink?: boolean
}

export async function createMessage(page: Page, options: CreateMessageOptions) {
  const ui = locators(page)

  await ui.createMessageButton.click()

  const modal = ui.dialog
  await expect(modal).toBeVisible()
  await expect(modal.getByText("Create Message")).toBeVisible()

  await modal.locator('input[name="title"]').fill(options.subject)

  const editor = modal.locator("[contenteditable]")
  await editor.click()
  await editor.fill(options.message)

  if (options.includeLink === false) {
    await modal.getByRole("checkbox", { name: /include link/i }).uncheck()
  }

  await modal.getByRole("button", { name: /send to/i }).click()

  await expect(modal).not.toBeVisible({ timeout: 15000 })
}
