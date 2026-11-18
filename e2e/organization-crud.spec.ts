import { testUsersByRole } from "./auth.setup"
import { expect, test } from "./fixtures/auth"
import { createFundraiser } from "./helpers/fundraiser"
import { addMember, deleteMember, editMember, navigateToMembersTab, viewMemberDetails } from "./helpers/member"
import { editOrganization, openOrganizationSettings, viewOrganizationDetails } from "./helpers/org"
import { type OrgContext, givenOrganizationCreated } from "./scenarios/organization"

const orgAdmin = testUsersByRole["organization_admin"]
const orgStaff = testUsersByRole["organization_staff"]

if (!orgAdmin || !orgStaff) {
  throw new Error("Required test users (ORGANIZATION_ADMIN, ORGANIZATION_STAFF) not found")
}

test.describe("Organization CRUD (Sales Representative)", () => {
  test.describe.configure({ mode: "serial" })

  let orgContext: OrgContext | undefined

  test.beforeEach(async ({}, testInfo) => {
    if (testInfo.title !== "create organization" && !orgContext) {
      testInfo.skip(true, "Skipped: setup dependency failed")
    }
  })

  test("create organization", async ({ salesPage }) => {
    orgContext = await givenOrganizationCreated(salesPage)
    await expect(salesPage.getByRole("heading", { name: orgContext.orgName })).toBeVisible()
  })

  test("verify organization appears in list", async ({ salesPage }) => {
    await salesPage.goto("/dashboard/organizations")
    await expect(salesPage.getByText("View, create and manage")).toBeVisible()
    await salesPage.getByPlaceholder("Search by Name").fill(orgContext!.orgName)
    await expect(salesPage.getByRole("row").filter({ hasText: orgContext!.orgName })).toBeVisible()
  })

  test("navigate to organization details via View button", async ({ salesPage }) => {
    await salesPage.goto("/dashboard/organizations")
    await expect(salesPage.getByText("View, create and manage")).toBeVisible()
    await viewOrganizationDetails(salesPage, orgContext!.orgName)
    await expect(salesPage.getByRole("heading", { name: orgContext!.orgName })).toBeVisible()
    await expect(salesPage.getByRole("tab", { name: /fundraisers/i })).toBeVisible()
    await expect(salesPage.getByRole("tab", { name: /members/i })).toBeVisible()
  })

  test("edit organization name", async ({ salesPage }) => {
    await salesPage.goto(orgContext!.orgUrl)
    const updatedName = `E2E Edited ${Date.now()}`
    const dialog = await openOrganizationSettings(salesPage)
    await editOrganization(salesPage, { name: updatedName }, dialog)
    await expect(salesPage.getByRole("heading", { name: updatedName })).toBeVisible()
    orgContext = { ...orgContext!, orgName: updatedName }
  })

  test("add member to organization", async ({ salesPage }) => {
    await salesPage.goto(orgContext!.orgUrl)
    await navigateToMembersTab(salesPage)
    await addMember(salesPage, { email: orgStaff.email, role: "Organization Staff" })
    await expect(salesPage.getByRole("row").filter({ hasText: orgStaff.email })).toBeVisible({ timeout: 10000 })
  })

  test("view member details", async ({ salesPage }) => {
    await salesPage.goto(orgContext!.orgUrl)
    await navigateToMembersTab(salesPage)
    await expect(salesPage.getByRole("row").filter({ hasText: orgStaff.email })).toBeVisible({ timeout: 10000 })
    const sheet = await viewMemberDetails(salesPage, orgStaff.email)
    await expect(sheet.getByText(orgStaff.email)).toBeVisible()
    await expect(sheet.getByRole("button", { name: /edit/i })).toBeVisible()
    await expect(sheet.getByRole("button", { name: /delete/i })).toBeVisible()
  })

  test("edit member name", async ({ salesPage }) => {
    await salesPage.goto(orgContext!.orgUrl)
    await navigateToMembersTab(salesPage)
    await expect(salesPage.getByRole("row").filter({ hasText: orgStaff.email })).toBeVisible({ timeout: 10000 })
    const sheet = await viewMemberDetails(salesPage, orgStaff.email)
    const updatedFirstName = `E2E Edited ${Date.now()}`
    await editMember(salesPage, { firstName: updatedFirstName }, sheet)
    await expect(salesPage.getByRole("row").filter({ hasText: updatedFirstName })).toBeVisible({ timeout: 10000 })
  })

  test("delete member", async ({ salesPage }) => {
    await salesPage.goto(orgContext!.orgUrl)
    await navigateToMembersTab(salesPage)
    const sheet = await viewMemberDetails(salesPage, orgStaff.email)
    await deleteMember(salesPage, sheet)
    await expect(salesPage.getByRole("row").filter({ hasText: orgStaff.email })).not.toBeVisible()
  })

  test("create fundraiser", async ({ salesPage }) => {
    await salesPage.goto(orgContext!.orgUrl)
    await salesPage.getByRole("tab", { name: /fundraisers/i }).click()
    const { id, name } = await createFundraiser(salesPage, { sponsorEmail: orgAdmin.email })
    expect(id).toBeTruthy()
    await expect(salesPage.getByRole("heading", { name })).toBeVisible()
  })
})
