import { testUsersByRole } from "./auth.setup"
import { expect, test } from "./fixtures/auth"
import { createFundraiser } from "./helpers/fundraiser"
import { addMember, deleteMember, editMember, navigateToMembersTab, viewMemberDetails } from "./helpers/member"
import { editOrganization, openOrganizationSettings, viewOrganizationDetails } from "./helpers/org"
import {
  addParticipant,
  deleteParticipant,
  editParticipant,
  navigateToFundraiserParticipants,
  viewParticipantDetails,
} from "./helpers/participant"
import { type FundraiserContext } from "./scenarios/fundraiser"
import { type OrgContext, givenOrganizationCreated } from "./scenarios/organization"

const orgStaff = testUsersByRole["organization_staff"]
const orgAdmin = testUsersByRole["organization_admin"]

if (!orgStaff || !orgAdmin) {
  throw new Error("Required test users (ORGANIZATION_STAFF, ORGANIZATION_ADMIN) not found")
}

test.describe("Organization CRUD (WFC Admin)", () => {
  test.describe.configure({ mode: "serial" })

  let orgContext: OrgContext | undefined
  let fundraiserContext: FundraiserContext | undefined

  test.beforeEach(async ({}, testInfo) => {
    if (testInfo.title !== "create organization" && !orgContext) {
      testInfo.skip(true, "Skipped: setup dependency failed")
    }
  })

  test("create organization", async ({ wfcAdminPage }) => {
    orgContext = await givenOrganizationCreated(wfcAdminPage)
    await expect(wfcAdminPage.getByRole("heading", { name: orgContext.orgName })).toBeVisible()
  })

  test("verify organization appears in list", async ({ wfcAdminPage }) => {
    await wfcAdminPage.goto("/dashboard/organizations")
    await expect(wfcAdminPage.getByText("View, create and manage")).toBeVisible()
    await wfcAdminPage.getByPlaceholder("Search by Name").fill(orgContext!.orgName)
    await expect(wfcAdminPage.getByRole("row").filter({ hasText: orgContext!.orgName })).toBeVisible()
  })

  test("navigate to organization details", async ({ wfcAdminPage }) => {
    await wfcAdminPage.goto("/dashboard/organizations")
    await expect(wfcAdminPage.getByText("View, create and manage")).toBeVisible()
    await viewOrganizationDetails(wfcAdminPage, orgContext!.orgName)
    await expect(wfcAdminPage.getByRole("heading", { name: orgContext!.orgName })).toBeVisible()
  })

  test("edit organization name", async ({ wfcAdminPage }) => {
    await wfcAdminPage.goto(orgContext!.orgUrl)
    const updatedName = `E2E WfcAdmin Edited ${Date.now()}`
    const dialog = await openOrganizationSettings(wfcAdminPage)
    await editOrganization(wfcAdminPage, { name: updatedName }, dialog)
    await expect(wfcAdminPage.getByRole("heading", { name: updatedName })).toBeVisible()
    orgContext = { ...orgContext!, orgName: updatedName }
  })

  test("add member to organization", async ({ wfcAdminPage }) => {
    await wfcAdminPage.goto(orgContext!.orgUrl)
    await navigateToMembersTab(wfcAdminPage)
    await addMember(wfcAdminPage, { email: orgStaff.email, role: "Organization Staff" })
    await expect(wfcAdminPage.getByRole("row").filter({ hasText: orgStaff.email })).toBeVisible({ timeout: 10000 })
  })

  test("edit member name", async ({ wfcAdminPage }) => {
    await wfcAdminPage.goto(orgContext!.orgUrl)
    await navigateToMembersTab(wfcAdminPage)
    await expect(wfcAdminPage.getByRole("row").filter({ hasText: orgStaff.email })).toBeVisible({ timeout: 10000 })
    const sheet = await viewMemberDetails(wfcAdminPage, orgStaff.email)
    const updatedFirstName = `WfcEdited ${Date.now()}`
    await editMember(wfcAdminPage, { firstName: updatedFirstName }, sheet)
    await expect(wfcAdminPage.getByRole("row").filter({ hasText: updatedFirstName })).toBeVisible({ timeout: 10000 })
  })

  test("delete member", async ({ wfcAdminPage }) => {
    await wfcAdminPage.goto(orgContext!.orgUrl)
    await navigateToMembersTab(wfcAdminPage)
    const sheet = await viewMemberDetails(wfcAdminPage, orgStaff.email)
    await deleteMember(wfcAdminPage, sheet)
    await expect(wfcAdminPage.getByRole("row").filter({ hasText: orgStaff.email })).not.toBeVisible()
  })

  test("create fundraiser", async ({ wfcAdminPage }) => {
    await wfcAdminPage.goto(orgContext!.orgUrl)
    await wfcAdminPage.getByRole("tab", { name: /fundraisers/i }).click()
    const { id, name } = await createFundraiser(wfcAdminPage, { sponsorEmail: orgAdmin.email })
    expect(id).toBeTruthy()
    await expect(wfcAdminPage.getByRole("heading", { name })).toBeVisible()
    fundraiserContext = {
      ...orgContext!,
      fundraiserId: id,
      fundraiserName: name,
      fundraiserUrl: `${orgContext!.orgUrl}/campaigns/${id}`,
    }
  })

  test("add participant to fundraiser", async ({ wfcAdminPage }) => {
    await wfcAdminPage.goto(fundraiserContext!.fundraiserUrl)
    await navigateToFundraiserParticipants(wfcAdminPage)
    const firstName = `WfcKid${Date.now()}`
    await addParticipant(wfcAdminPage, {
      firstName,
      lastName: "TestChild",
      grade: "3rd",
      teacherName: "Mrs. Clark",
    })
    await expect(wfcAdminPage.getByRole("row").filter({ hasText: firstName })).toBeVisible({ timeout: 10000 })
  })

  test("edit participant", async ({ wfcAdminPage }) => {
    await wfcAdminPage.goto(fundraiserContext!.fundraiserUrl)
    await navigateToFundraiserParticipants(wfcAdminPage)
    const rows = wfcAdminPage.getByRole("row").filter({ hasText: "WfcKid" })
    await expect(rows.first()).toBeVisible({ timeout: 10000 })
    const firstName = await rows.first().locator("td:nth-child(2)").textContent()
    const sheet = await viewParticipantDetails(wfcAdminPage, firstName!)
    const updatedName = `WfcEdKid${Date.now()}`
    await editParticipant(wfcAdminPage, { firstName: updatedName }, sheet)
    await expect(wfcAdminPage.getByRole("row").filter({ hasText: updatedName })).toBeVisible({ timeout: 10000 })
  })

  test("delete participant", async ({ wfcAdminPage }) => {
    await wfcAdminPage.goto(fundraiserContext!.fundraiserUrl)
    await navigateToFundraiserParticipants(wfcAdminPage)
    const rows = wfcAdminPage.getByRole("row").filter({ hasText: "WfcEdKid" })
    await expect(rows.first()).toBeVisible({ timeout: 10000 })
    const firstName = await rows.first().locator("td:nth-child(2)").textContent()
    const sheet = await viewParticipantDetails(wfcAdminPage, firstName!)
    await deleteParticipant(wfcAdminPage, sheet)
    await expect(wfcAdminPage.getByRole("row").filter({ hasText: firstName! })).not.toBeVisible()
  })
})
