import { testUsersByRole } from "./auth.setup"
import { expect, test } from "./fixtures/auth"
import { createFundraiser } from "./helpers/fundraiser"
import { addMember, deleteMember, editMember, navigateToMembersTab, viewMemberDetails } from "./helpers/member"
import { editOrganization, openOrganizationSettings } from "./helpers/org"
import {
  addParticipant,
  deleteParticipant,
  editParticipant,
  navigateToFundraiserParticipants,
  viewParticipantDetails,
} from "./helpers/participant"
import { type FundraiserContext } from "./scenarios/fundraiser"
import { type OrgContext, givenOrganizationCreated } from "./scenarios/organization"

const orgAdmin = testUsersByRole["organization_admin"]
const orgStaff = testUsersByRole["organization_staff"]

if (!orgAdmin || !orgStaff) {
  throw new Error("Required test users (ORGANIZATION_ADMIN, ORGANIZATION_STAFF) not found")
}

test.describe("Organization CRUD (Organization Admin)", () => {
  test.describe.configure({ mode: "serial" })

  let orgContext: OrgContext | undefined
  let fundraiserContext: FundraiserContext | undefined

  test.beforeEach(async ({}, testInfo) => {
    if (testInfo.title !== "setup: sales rep creates org and fundraiser" && !orgContext) {
      testInfo.skip(true, "Skipped: setup dependency failed")
    }
  })

  test("setup: sales rep creates org and fundraiser", async ({ salesPage }) => {
    orgContext = await givenOrganizationCreated(salesPage)

    await salesPage.getByRole("tab", { name: /members/i }).click()
    await addMember(salesPage, { email: orgAdmin.email, role: "Organization Admin" })
    await expect(salesPage.getByRole("row").filter({ hasText: orgAdmin.email })).toBeVisible({ timeout: 10000 })

    await salesPage.getByRole("tab", { name: /fundraisers/i }).click()
    const { id, name } = await createFundraiser(salesPage, { sponsorEmail: orgStaff.email })
    fundraiserContext = {
      ...orgContext,
      fundraiserId: id,
      fundraiserName: name,
      fundraiserUrl: `${orgContext.orgUrl}/campaigns/${id}`,
    }
  })

  test("org admin can view organization details", async ({ orgAdminPage }) => {
    await orgAdminPage.goto(orgContext!.orgUrl)
    await expect(orgAdminPage.getByRole("heading", { name: orgContext!.orgName })).toBeVisible({ timeout: 10000 })
  })

  test("org admin can edit organization name", async ({ orgAdminPage }) => {
    await orgAdminPage.goto(orgContext!.orgUrl)
    await expect(orgAdminPage.getByRole("heading", { name: orgContext!.orgName })).toBeVisible({ timeout: 10000 })
    const updatedName = `E2E OaEdited ${Date.now()}`
    const dialog = await openOrganizationSettings(orgAdminPage)
    await editOrganization(orgAdminPage, { name: updatedName }, dialog)
    await expect(orgAdminPage.getByRole("heading", { name: updatedName })).toBeVisible()
    orgContext = { ...orgContext!, orgName: updatedName }
  })

  test("org admin can add member", async ({ orgAdminPage }) => {
    await orgAdminPage.goto(orgContext!.orgUrl)
    await navigateToMembersTab(orgAdminPage)
    await addMember(orgAdminPage, { email: orgStaff.email, role: "Organization Staff" })
    await expect(orgAdminPage.getByRole("row").filter({ hasText: orgStaff.email })).toBeVisible({ timeout: 10000 })
  })

  test("org admin can edit member", async ({ orgAdminPage }) => {
    await orgAdminPage.goto(orgContext!.orgUrl)
    await navigateToMembersTab(orgAdminPage)
    await expect(orgAdminPage.getByRole("row").filter({ hasText: orgStaff.email })).toBeVisible({ timeout: 10000 })
    const sheet = await viewMemberDetails(orgAdminPage, orgStaff.email)
    const updatedFirstName = `OaEdited ${Date.now()}`
    await editMember(orgAdminPage, { firstName: updatedFirstName }, sheet)
    await expect(orgAdminPage.getByRole("row").filter({ hasText: updatedFirstName })).toBeVisible({ timeout: 10000 })
  })

  test("org admin can delete member", async ({ orgAdminPage }) => {
    await orgAdminPage.goto(orgContext!.orgUrl)
    await navigateToMembersTab(orgAdminPage)
    const sheet = await viewMemberDetails(orgAdminPage, orgStaff.email)
    await deleteMember(orgAdminPage, sheet)
    await expect(orgAdminPage.getByRole("row").filter({ hasText: orgStaff.email })).not.toBeVisible()
  })

  test("org admin can add participant to fundraiser", async ({ orgAdminPage }) => {
    await orgAdminPage.goto(fundraiserContext!.fundraiserUrl)
    await navigateToFundraiserParticipants(orgAdminPage)
    const firstName = `OaKid${Date.now()}`
    await addParticipant(orgAdminPage, {
      firstName,
      lastName: "AdminChild",
      grade: "4th",
      teacherName: "Mr. Adams",
    })
    await expect(orgAdminPage.getByRole("row").filter({ hasText: firstName })).toBeVisible({ timeout: 10000 })
  })

  test("org admin can edit participant", async ({ orgAdminPage }) => {
    await orgAdminPage.goto(fundraiserContext!.fundraiserUrl)
    await navigateToFundraiserParticipants(orgAdminPage)
    const rows = orgAdminPage.getByRole("row").filter({ hasText: "OaKid" })
    await expect(rows.first()).toBeVisible({ timeout: 10000 })
    const firstName = await rows.first().locator("td:nth-child(2)").textContent()
    const sheet = await viewParticipantDetails(orgAdminPage, firstName!)
    const updatedName = `OaEdKid${Date.now()}`
    await editParticipant(orgAdminPage, { firstName: updatedName }, sheet)
    await expect(orgAdminPage.getByRole("row").filter({ hasText: updatedName })).toBeVisible({ timeout: 10000 })
  })

  test("org admin can delete participant", async ({ orgAdminPage }) => {
    await orgAdminPage.goto(fundraiserContext!.fundraiserUrl)
    await navigateToFundraiserParticipants(orgAdminPage)
    const rows = orgAdminPage.getByRole("row").filter({ hasText: "OaEdKid" })
    await expect(rows.first()).toBeVisible({ timeout: 10000 })
    const firstName = await rows.first().locator("td:nth-child(2)").textContent()
    const sheet = await viewParticipantDetails(orgAdminPage, firstName!)
    await deleteParticipant(orgAdminPage, sheet)
    await expect(orgAdminPage.getByRole("row").filter({ hasText: firstName! })).not.toBeVisible()
  })
})
