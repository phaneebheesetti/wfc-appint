import { testUsersByRole } from "./auth.setup"
import { type RoleKey, expect, test } from "./fixtures/auth"
import { type FundraiserContext } from "./scenarios/fundraiser"
import { type OrgContext, givenOrganizationCreated } from "./scenarios/organization"
import { ALL_TESTABLE_ROLES, type Role, SCREENS, getRolesWithoutAccess, resolveRoles } from "./screen-map"

const ROLE_TO_FIXTURE_KEY: Record<Role, RoleKey> = {
  WFC_ADMIN: "wfcAdmin",
  SALES_MANAGER: "salesManager",
  SALES_REPRESENTATIVE: "salesRepresentative",
  ORGANIZATION_ADMIN: "organizationAdmin",
  ORGANIZATION_STAFF: "organizationStaff",
  PARENT: "parent",
  PARTICIPANT: "participant",
}

const SIMPLE_SCREENS = SCREENS.filter(s => !s.requiresOrgContext && !s.requiresFundraiserContext && !s.isExternal)

test.describe("Permission Matrix: Simple Screens", () => {
  for (const screen of SIMPLE_SCREENS) {
    if (screen.id === "dashboard") continue

    const allowedRoles = resolveRoles(screen.accessRoles)
    const deniedRoles = getRolesWithoutAccess(screen)

    for (const role of allowedRoles) {
      test(`${screen.id} - ${role} can access`, async ({ authenticatedPage }) => {
        const page = await authenticatedPage(ROLE_TO_FIXTURE_KEY[role])
        await page.goto(screen.path)
        await expect(page).not.toHaveURL(/\/dashboard$/)
        await expect(page.getByRole("heading", { name: screen.heading }).first()).toBeVisible({ timeout: 10000 })
      })
    }

    for (const role of deniedRoles) {
      test(`${screen.id} - ${role} is redirected`, async ({ authenticatedPage }) => {
        const page = await authenticatedPage(ROLE_TO_FIXTURE_KEY[role])
        await page.goto(screen.path)
        await page.waitForURL(/\/dashboard/, { timeout: 10000 })
        await expect(page).toHaveURL(/\/dashboard$/)
      })
    }

    for (const cta of screen.ctas) {
      for (const role of allowedRoles) {
        const shouldSee = cta.visibleFor.includes(role)
        test(`${screen.id} - ${role} ${shouldSee ? "sees" : "does not see"} "${cta.label.source}"`, async ({
          authenticatedPage,
        }) => {
          const page = await authenticatedPage(ROLE_TO_FIXTURE_KEY[role])
          await page.goto(screen.path)
          await expect(page.getByRole("heading", { name: screen.heading }).first()).toBeVisible({ timeout: 10000 })
          const button = page.getByRole("button", { name: cta.label })
          if (shouldSee) {
            await expect(button).toBeVisible({ timeout: 5000 })
          } else {
            await expect(button).not.toBeVisible({ timeout: 3000 })
          }
        })
      }
    }
  }
})

test.describe("Permission Matrix: Sidebar Visibility", () => {
  for (const screen of SCREENS) {
    if (!screen.sidebarLabel) continue
    if (screen.id === "dashboard") continue

    const sidebarRoles = resolveRoles(screen.sidebarRoles)
    const nonSidebarRoles = ALL_TESTABLE_ROLES.filter(r => !sidebarRoles.includes(r))

    for (const role of sidebarRoles) {
      test(`sidebar - ${role} sees "${screen.sidebarLabel}"`, async ({ authenticatedPage }) => {
        const page = await authenticatedPage(ROLE_TO_FIXTURE_KEY[role])
        await page.goto("/dashboard")
        await expect(page.getByRole("link", { name: screen.sidebarLabel! })).toBeVisible({ timeout: 10000 })
      })
    }

    for (const role of nonSidebarRoles) {
      test(`sidebar - ${role} does not see "${screen.sidebarLabel}"`, async ({ authenticatedPage }) => {
        const page = await authenticatedPage(ROLE_TO_FIXTURE_KEY[role])
        await page.goto("/dashboard")
        await page.waitForURL(/\/dashboard/, { timeout: 10000 })
        await expect(page.locator("[data-sidebar='menu-button']").first()).toBeVisible({ timeout: 10000 })
        await expect(page.getByRole("link", { name: screen.sidebarLabel! })).not.toBeVisible({ timeout: 3000 })
      })
    }
  }
})

test.describe("Permission Matrix: Org-Context Screens", () => {
  let orgContext: OrgContext | undefined
  let fundraiserContext: FundraiserContext | undefined

  test.describe.configure({ mode: "serial" })

  test.beforeEach(async ({}, testInfo) => {
    if (testInfo.title !== "setup: create org and fundraiser" && (!orgContext || !fundraiserContext)) {
      testInfo.skip(true, "Skipped: setup dependency failed")
    }
  })

  test("setup: create org and fundraiser", async ({ salesPage }) => {
    orgContext = await givenOrganizationCreated(salesPage)

    await salesPage.getByRole("tab", { name: /fundraisers/i }).click()

    const orgAdmin = testUsersByRole["organization_admin"]
    if (!orgAdmin) throw new Error("ORGANIZATION_ADMIN test user not found")

    const { id, name } = await (
      await import("./helpers/fundraiser")
    ).createFundraiser(salesPage, {
      sponsorEmail: orgAdmin.email,
    })

    fundraiserContext = {
      ...orgContext,
      fundraiserId: id,
      fundraiserName: name,
      fundraiserUrl: `${orgContext.orgUrl}/campaigns/${id}`,
    }
  })

  const ORG_SCREENS = SCREENS.filter(s => s.requiresOrgContext && !s.requiresFundraiserContext)
  const FUNDRAISER_SCREENS = SCREENS.filter(s => s.requiresFundraiserContext)

  for (const screen of ORG_SCREENS) {
    for (const cta of screen.ctas) {
      for (const role of resolveRoles(screen.accessRoles)) {
        const shouldSee = cta.visibleFor.includes(role)
        test(`${screen.id} - ${role} ${shouldSee ? "sees" : "does not see"} "${cta.label.source}"`, async ({
          authenticatedPage,
        }) => {
          const page = await authenticatedPage(ROLE_TO_FIXTURE_KEY[role])
          await page.goto(orgContext!.orgUrl)

          if (screen.id === "organization-members") {
            await page.getByRole("tab", { name: /members/i }).click()
            await expect(page.getByRole("tabpanel")).toBeVisible({ timeout: 10000 })
          } else if (screen.id === "organization-fundraisers") {
            await page.getByRole("tab", { name: /fundraisers/i }).click()
            await expect(page.getByRole("tabpanel")).toBeVisible({ timeout: 10000 })
          }

          const button = page.getByRole("button", { name: cta.label })
          if (shouldSee) {
            await expect(button).toBeVisible({ timeout: 5000 })
          } else {
            await expect(button).not.toBeVisible({ timeout: 3000 })
          }
        })
      }
    }
  }

  for (const screen of FUNDRAISER_SCREENS) {
    for (const cta of screen.ctas) {
      for (const role of resolveRoles(screen.accessRoles)) {
        const shouldSee = cta.visibleFor.includes(role)
        test(`${screen.id} - ${role} ${shouldSee ? "sees" : "does not see"} "${cta.label.source}"`, async ({
          authenticatedPage,
        }) => {
          const page = await authenticatedPage(ROLE_TO_FIXTURE_KEY[role])
          await page.goto(fundraiserContext!.fundraiserUrl)

          const participantsTab = page.getByRole("tab", { name: /participants/i })
          await expect(participantsTab).toBeVisible({ timeout: 10000 })
          await participantsTab.click({ force: true })
          await expect(page.getByRole("tabpanel")).toBeVisible({ timeout: 10000 })

          const button = page.getByRole("button", { name: cta.label })
          if (shouldSee) {
            await expect(button).toBeVisible({ timeout: 5000 })
          } else {
            await expect(button).not.toBeVisible({ timeout: 3000 })
          }
        })
      }
    }
  }
})
