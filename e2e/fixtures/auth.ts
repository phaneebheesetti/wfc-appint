import { type Browser, type BrowserContext, type Page, test as base } from "@playwright/test"

type RoleKey =
  | "wfcAdmin"
  | "salesManager"
  | "salesRepresentative"
  | "organizationAdmin"
  | "organizationStaff"
  | "parent"
  | "participant"

const STORAGE_STATE_PATHS: Record<RoleKey, string> = {
  wfcAdmin: ".auth/wfc-admin.json",
  salesManager: ".auth/sales-manager.json",
  salesRepresentative: ".auth/sales-representative.json",
  organizationAdmin: ".auth/organization-admin.json",
  organizationStaff: ".auth/organization-staff.json",
  parent: ".auth/parent.json",
  participant: ".auth/participant.json",
}

type AuthFixtures = {
  wfcAdminPage: Page
  salesManagerPage: Page
  salesPage: Page
  orgAdminPage: Page
  orgStaffPage: Page
  parentPage: Page
  participantPage: Page
  authenticatedPage: (role: RoleKey) => Promise<Page>
}

async function createAuthenticatedPage(
  browser: Browser,
  baseURL: string | undefined,
  role: RoleKey
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({
    storageState: STORAGE_STATE_PATHS[role],
    baseURL,
  })
  const page = await context.newPage()
  return { context, page }
}

const BASE_URL = process.env.APP_URL ?? "http://localhost:3000"

export const test = base.extend<AuthFixtures>({
  wfcAdminPage: async ({ browser }, _use) => {
    const { context, page } = await createAuthenticatedPage(browser, BASE_URL, "wfcAdmin")
    await _use(page)
    await context.close()
  },

  salesManagerPage: async ({ browser }, _use) => {
    const { context, page } = await createAuthenticatedPage(browser, BASE_URL, "salesManager")
    await _use(page)
    await context.close()
  },

  salesPage: async ({ browser }, _use) => {
    const { context, page } = await createAuthenticatedPage(browser, BASE_URL, "salesRepresentative")
    await _use(page)
    await context.close()
  },

  orgAdminPage: async ({ browser }, _use) => {
    const { context, page } = await createAuthenticatedPage(browser, BASE_URL, "organizationAdmin")
    await _use(page)
    await context.close()
  },

  orgStaffPage: async ({ browser }, _use) => {
    const { context, page } = await createAuthenticatedPage(browser, BASE_URL, "organizationStaff")
    await _use(page)
    await context.close()
  },

  parentPage: async ({ browser }, _use) => {
    const { context, page } = await createAuthenticatedPage(browser, BASE_URL, "parent")
    await _use(page)
    await context.close()
  },

  participantPage: async ({ browser }, _use) => {
    const { context, page } = await createAuthenticatedPage(browser, BASE_URL, "participant")
    await _use(page)
    await context.close()
  },

  authenticatedPage: async ({ browser }, _use) => {
    const contexts: BrowserContext[] = []
    const factory = async (role: RoleKey): Promise<Page> => {
      const { context, page } = await createAuthenticatedPage(browser, BASE_URL, role)
      contexts.push(context)
      return page
    }
    await _use(factory)
    for (const ctx of contexts) {
      await ctx.close()
    }
  },
})

export { expect } from "@playwright/test"
export type { RoleKey }
