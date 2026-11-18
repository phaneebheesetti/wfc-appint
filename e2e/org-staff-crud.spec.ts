import { testUsersByRole } from "./auth.setup"
import { expect, test } from "./fixtures/auth"
import { createFundraiser } from "./helpers/fundraiser"
import { addMember, navigateToMembersTab } from "./helpers/member"
import { addParticipant, navigateToFundraiserParticipants } from "./helpers/participant"
import { type FundraiserContext } from "./scenarios/fundraiser"
import { type OrgContext, givenOrganizationCreated } from "./scenarios/organization"

const orgAdmin = testUsersByRole["organization_admin"]
const orgStaff = testUsersByRole["organization_staff"]

if (!orgAdmin || !orgStaff) {
  throw new Error("Required test users (ORGANIZATION_ADMIN, ORGANIZATION_STAFF) not found")
}

test.describe("Organization CRUD (Organization Staff)", () => {
  test.describe.configure({ mode: "serial" })

  let orgContext: OrgContext | undefined
  let fundraiserContext: FundraiserContext | undefined

  test.beforeEach(async ({}, testInfo) => {
    if (testInfo.title !== "setup: sales rep creates org with staff member and fundraiser" && !orgContext) {
      testInfo.skip(true, "Skipped: setup dependency failed")
    }
  })

  test("setup: sales rep creates org with staff member and fundraiser", async ({ salesPage }) => {
    orgContext = await givenOrganizationCreated(salesPage)

    await salesPage.getByRole("tab", { name: /members/i }).click()
    await addMember(salesPage, { email: orgStaff.email, role: "Organization Staff" })
    await expect(salesPage.getByRole("row").filter({ hasText: orgStaff.email })).toBeVisible({ timeout: 10000 })

    await salesPage.getByRole("tab", { name: /fundraisers/i }).click()
    const { id, name } = await createFundraiser(salesPage, { sponsorEmail: orgAdmin.email })
    fundraiserContext = {
      ...orgContext,
      fundraiserId: id,
      fundraiserName: name,
      fundraiserUrl: `${orgContext.orgUrl}/campaigns/${id}`,
    }
  })

  test("org staff can view organization details", async ({ orgStaffPage }) => {
    await orgStaffPage.goto(orgContext!.orgUrl)
    await expect(orgStaffPage.getByRole("heading", { name: orgContext!.orgName })).toBeVisible({ timeout: 10000 })
  })

  test("org staff can add member", async ({ orgStaffPage }) => {
    await orgStaffPage.goto(orgContext!.orgUrl)
    await navigateToMembersTab(orgStaffPage)
    await addMember(orgStaffPage, { email: orgAdmin.email, role: "Organization Admin" })
    await expect(orgStaffPage.getByRole("row").filter({ hasText: orgAdmin.email })).toBeVisible({ timeout: 10000 })
  })

  test("org staff can add participant to fundraiser", async ({ orgStaffPage }) => {
    await orgStaffPage.goto(fundraiserContext!.fundraiserUrl)
    await navigateToFundraiserParticipants(orgStaffPage)
    const firstName = `StaffKid${Date.now()}`
    await addParticipant(orgStaffPage, {
      firstName,
      lastName: "StaffChild",
      grade: "5th",
      teacherName: "Ms. Baker",
    })
    await expect(orgStaffPage.getByRole("row").filter({ hasText: firstName })).toBeVisible({ timeout: 10000 })
  })
})
