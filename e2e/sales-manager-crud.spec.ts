import { testUsersByRole } from "./auth.setup"
import { expect, test } from "./fixtures/auth"
import { createFundraiser } from "./helpers/fundraiser"
import { addMember, deleteMember, editMember, navigateToMembersTab, viewMemberDetails } from "./helpers/member"
import { editOrganization, openOrganizationSettings, viewOrganizationDetails } from "./helpers/org"
import { type OrgContext, givenOrganizationCreated } from "./scenarios/organization"

const orgStaff = testUsersByRole["organization_staff"]
const orgAdmin = testUsersByRole["organization_admin"]

if (!orgStaff || !orgAdmin) {
  throw new Error("Required test users (ORGANIZATION_STAFF, ORGANIZATION_ADMIN) not found")
}

test.describe("Organization CRUD (Sales Manager)", () => {
  test.describe.configure({ mode: "serial" })

  let orgContext: OrgContext | undefined

  test.beforeEach(async ({}, testInfo) => {
    if (testInfo.title !== "create organization" && !orgContext) {
      testInfo.skip(true, "Skipped: setup dependency failed")
    }
  })

  test("create organization", async ({ salesManagerPage }) => {
    orgContext = await givenOrganizationCreated(salesManagerPage)
    await expect(salesManagerPage.getByRole("heading", { name: orgContext.orgName })).toBeVisible()
  })

  test("verify organization appears in list", async ({ salesManagerPage }) => {
    await salesManagerPage.goto("/dashboard/organizations")
    await expect(salesManagerPage.getByText("View, create and manage")).toBeVisible()
    await salesManagerPage.getByPlaceholder("Search by Name").fill(orgContext!.orgName)
    await expect(salesManagerPage.getByRole("row").filter({ hasText: orgContext!.orgName })).toBeVisible()
  })

  test("navigate to organization details", async ({ salesManagerPage }) => {
    await salesManagerPage.goto("/dashboard/organizations")
    await expect(salesManagerPage.getByText("View, create and manage")).toBeVisible()
    await viewOrganizationDetails(salesManagerPage, orgContext!.orgName)
    await expect(salesManagerPage.getByRole("heading", { name: orgContext!.orgName })).toBeVisible()
  })

  test("edit organization name", async ({ salesManagerPage }) => {
    await salesManagerPage.goto(orgContext!.orgUrl)
    const updatedName = `E2E SmEdited ${Date.now()}`
    const dialog = await openOrganizationSettings(salesManagerPage)
    await editOrganization(salesManagerPage, { name: updatedName }, dialog)
    await expect(salesManagerPage.getByRole("heading", { name: updatedName })).toBeVisible()
    orgContext = { ...orgContext!, orgName: updatedName }
  })

  test("add member to organization", async ({ salesManagerPage }) => {
    await salesManagerPage.goto(orgContext!.orgUrl)
    await navigateToMembersTab(salesManagerPage)
    await addMember(salesManagerPage, { email: orgStaff.email, role: "Organization Staff" })
    await expect(salesManagerPage.getByRole("row").filter({ hasText: orgStaff.email })).toBeVisible({ timeout: 10000 })
  })

  test("edit member name", async ({ salesManagerPage }) => {
    await salesManagerPage.goto(orgContext!.orgUrl)
    await navigateToMembersTab(salesManagerPage)
    await expect(salesManagerPage.getByRole("row").filter({ hasText: orgStaff.email })).toBeVisible({ timeout: 10000 })
    const sheet = await viewMemberDetails(salesManagerPage, orgStaff.email)
    const updatedFirstName = `SmEdited ${Date.now()}`
    await editMember(salesManagerPage, { firstName: updatedFirstName }, sheet)
    await expect(salesManagerPage.getByRole("row").filter({ hasText: updatedFirstName })).toBeVisible({
      timeout: 10000,
    })
  })

  test("delete member", async ({ salesManagerPage }) => {
    await salesManagerPage.goto(orgContext!.orgUrl)
    await navigateToMembersTab(salesManagerPage)
    const sheet = await viewMemberDetails(salesManagerPage, orgStaff.email)
    await deleteMember(salesManagerPage, sheet)
    await expect(salesManagerPage.getByRole("row").filter({ hasText: orgStaff.email })).not.toBeVisible()
  })

  test("create fundraiser", async ({ salesManagerPage }) => {
    await salesManagerPage.goto(orgContext!.orgUrl)
    await salesManagerPage.getByRole("tab", { name: /fundraisers/i }).click()
    const { id, name } = await createFundraiser(salesManagerPage, { sponsorEmail: orgAdmin.email })
    expect(id).toBeTruthy()
    await expect(salesManagerPage.getByRole("heading", { name })).toBeVisible()
  })
})
