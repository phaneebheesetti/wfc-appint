import { clerk } from "@clerk/testing/playwright"
import { expect, test } from "@playwright/test"

import { RolesEnum } from "@/constants/roles"

import { testUsersByRole } from "./auth.setup"
import { createMessage, navigateToCommunications } from "./helpers/communication"
import { createFundraiser } from "./helpers/fundraiser"
import { addMember, deleteMember, editMember, navigateToMembersTab, viewMemberDetails } from "./helpers/member"
import {
  createOrganization,
  editOrganization,
  listOrganizations,
  openOrganizationSettings,
  viewOrganizationDetails,
} from "./helpers/org"
import {
  addParticipant,
  deleteParticipant,
  editParticipant,
  navigateToFundraiserParticipants,
  viewParticipantDetails,
} from "./helpers/participant"

const salesRep = testUsersByRole[RolesEnum.SALES_REPRESENTATIVE]
if (!salesRep) {
  throw new Error("Sales representative test user is not defined in testUsersByRole")
}

const orgAdmin = testUsersByRole[RolesEnum.ORGANIZATION_ADMIN]
if (!orgAdmin) {
  throw new Error("Organization admin test user is not defined in testUsersByRole")
}

const orgStaff = testUsersByRole[RolesEnum.ORGANIZATION_STAFF]
if (!orgStaff) {
  throw new Error("Organization staff test user is not defined in testUsersByRole")
}

test.describe("Sales Rep Setup", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard")
    await clerk.signIn({
      page,
      signInParams: {
        strategy: "email_code",
        identifier: salesRep.email,
      },
    })
  })

  test("1. Create organization", async ({ page }) => {
    await createOrganization(page)
  })

  test("1b. List organizations on dashboard", async ({ page }) => {
    await listOrganizations(page)
    await expect(page.getByText("View, create and manage")).toBeVisible()
  })

  test("2. Create organization and verify it appears in the list", async ({ page }) => {
    const orgName = `E2E Org ${Date.now()}`
    await createOrganization(page, orgName)

    await page.goto("/dashboard/organizations")
    await expect(page.getByPlaceholder("Search by Name")).toBeVisible()
    await page.getByPlaceholder("Search by Name").fill(orgName)
    await expect(page.getByRole("row").filter({ hasText: orgName })).toBeVisible()
  })

  test("3. Navigate to organization details via View button", async ({ page }) => {
    const orgName = `E2E Details ${Date.now()}`
    await createOrganization(page, orgName)

    await page.goto("/dashboard/organizations")
    await expect(page.getByText("View, create and manage")).toBeVisible()

    await viewOrganizationDetails(page, orgName)

    await expect(page.getByRole("heading", { name: orgName })).toBeVisible()
    await expect(page.getByRole("tab", { name: /fundraisers/i })).toBeVisible()
    await expect(page.getByRole("tab", { name: /members/i })).toBeVisible()
  })

  test("4. Open organization settings sheet and view details", async ({ page }) => {
    const orgName = `E2E Settings ${Date.now()}`
    await createOrganization(page, orgName)

    await openOrganizationSettings(page)

    const dialog = page.getByRole("dialog")
    await expect(dialog.getByText(orgName)).toBeVisible()
    await expect(dialog.getByText("Address")).toBeVisible()
    await expect(dialog.getByRole("button", { name: /edit/i })).toBeVisible()
    await expect(dialog.getByRole("button", { name: /delete/i })).toBeVisible()
  })

  test("5. Edit organization name and save successfully", async ({ page }) => {
    const orgName = `E2E Edit ${Date.now()}`
    const updatedName = `E2E Edited ${Date.now()}`
    await createOrganization(page, orgName)

    const dialog = await openOrganizationSettings(page)
    await editOrganization(page, { name: updatedName }, dialog)

    await expect(page.getByRole("heading", { name: updatedName })).toBeVisible()
  })

  test("6. Create fundraiser for an organization", async ({ page }) => {
    const orgName = `E2E Fundraiser Org ${Date.now()}`
    await createOrganization(page, orgName)

    await page.getByRole("tab", { name: /fundraisers/i }).click()

    const { id, name } = await createFundraiser(page, {
      sponsorEmail: orgAdmin.email,
    })

    expect(id).toBeTruthy()
    await expect(page.getByRole("heading", { name })).toBeVisible()
  })

  test("7. Navigate to Members tab and verify it loads", async ({ page }) => {
    const orgName = `E2E Members ${Date.now()}`
    await createOrganization(page, orgName)

    await navigateToMembersTab(page)

    await expect(page.getByText("No results")).toBeVisible()
    await expect(page.getByRole("button", { name: /add member/i })).toBeVisible()
  })

  test("8. Add a new member to the organization", async ({ page }) => {
    const orgName = `E2E AddMember ${Date.now()}`
    await createOrganization(page, orgName)

    await navigateToMembersTab(page)

    await addMember(page, {
      email: orgStaff.email,
      role: "Organization Staff",
    })

    await expect(page.getByRole("row").filter({ hasText: orgStaff.email })).toBeVisible({ timeout: 10000 })
  })

  test("9. View member details via action button", async ({ page }) => {
    const orgName = `E2E ViewMember ${Date.now()}`
    await createOrganization(page, orgName)

    await navigateToMembersTab(page)

    await addMember(page, { email: orgStaff.email, role: "Organization Staff" })
    await expect(page.getByRole("row").filter({ hasText: orgStaff.email })).toBeVisible({ timeout: 10000 })

    const sheet = await viewMemberDetails(page, orgStaff.email)

    await expect(sheet.getByText(orgStaff.email)).toBeVisible()
    await expect(sheet.getByRole("button", { name: /edit/i })).toBeVisible()
    await expect(sheet.getByRole("button", { name: /delete/i })).toBeVisible()
  })

  test("10. Edit member name and save successfully", async ({ page }) => {
    const orgName = `E2E EditMember ${Date.now()}`
    await createOrganization(page, orgName)

    await navigateToMembersTab(page)

    await addMember(page, { email: orgStaff.email, role: "Organization Staff" })
    await expect(page.getByRole("row").filter({ hasText: orgStaff.email })).toBeVisible({ timeout: 10000 })

    const sheet = await viewMemberDetails(page, orgStaff.email)

    const updatedFirstName = `E2E Edited ${Date.now()}`
    await editMember(page, { firstName: updatedFirstName }, sheet)

    await expect(page.getByRole("row").filter({ hasText: updatedFirstName })).toBeVisible({ timeout: 10000 })
  })

  test("11. Delete a member from the organization", async ({ page }) => {
    const orgName = `E2E DeleteMember ${Date.now()}`
    await createOrganization(page, orgName)

    await navigateToMembersTab(page)

    await addMember(page, {
      email: orgStaff.email,
      role: "Organization Staff",
    })

    await expect(page.getByRole("row").filter({ hasText: orgStaff.email })).toBeVisible({ timeout: 10000 })

    const sheet = await viewMemberDetails(page, orgStaff.email)
    await deleteMember(page, sheet)

    await expect(page.getByRole("row").filter({ hasText: orgStaff.email })).not.toBeVisible()
  })

  test("12. Create fundraiser and verify participants tab shows empty state", async ({ page }) => {
    const orgName = `E2E Participants ${Date.now()}`
    await createOrganization(page, orgName)

    await page.getByRole("tab", { name: /fundraisers/i }).click()

    await createFundraiser(page, {
      sponsorEmail: orgAdmin.email,
    })

    await navigateToFundraiserParticipants(page)

    await expect(page.getByText("No results")).toBeVisible()
    await expect(page.getByRole("button", { name: /add participant/i })).toBeVisible()
  })

  test("13. Add a participant to a fundraiser and verify it appears in the list", async ({ page }) => {
    const orgName = `E2E AddParticipant ${Date.now()}`
    await createOrganization(page, orgName)

    await page.getByRole("tab", { name: /fundraisers/i }).click()

    await createFundraiser(page, {
      sponsorEmail: orgAdmin.email,
    })

    await navigateToFundraiserParticipants(page)

    const firstName = `Kid${Date.now()}`
    const lastName = "TestLast"

    await addParticipant(page, {
      firstName,
      lastName,
      grade: "5th",
      teacherName: "Mrs. Smith",
    })

    await expect(page.getByRole("row").filter({ hasText: firstName })).toBeVisible({ timeout: 10000 })
  })

  test("14. Add a participant with parent email and verify it appears", async ({ page }) => {
    const orgName = `E2E ParticipantParent ${Date.now()}`
    await createOrganization(page, orgName)

    await page.getByRole("tab", { name: /fundraisers/i }).click()

    await createFundraiser(page, {
      sponsorEmail: orgAdmin.email,
    })

    await navigateToFundraiserParticipants(page)

    const firstName = `Child${Date.now()}`
    const lastName = "WithParent"

    await addParticipant(page, {
      firstName,
      lastName,
      grade: "3rd",
      teacherName: "Mr. Jones",
      parentEmail: "e2e_parent+clerk_test@example.com",
    })

    await expect(page.getByRole("row").filter({ hasText: firstName })).toBeVisible({ timeout: 10000 })
  })

  test("15. View participant details via action button", async ({ page }) => {
    const orgName = `E2E ViewParticipant ${Date.now()}`
    await createOrganization(page, orgName)

    await page.getByRole("tab", { name: /fundraisers/i }).click()

    await createFundraiser(page, {
      sponsorEmail: orgAdmin.email,
    })

    await navigateToFundraiserParticipants(page)

    const firstName = `View${Date.now()}`
    const lastName = "Details"

    await addParticipant(page, {
      firstName,
      lastName,
      grade: "4th",
      teacherName: "Mrs. Davis",
    })

    await expect(page.getByRole("row").filter({ hasText: firstName })).toBeVisible({ timeout: 10000 })

    const sheet = await viewParticipantDetails(page, firstName)

    await expect(sheet.getByText("Fundraiser Participant")).toBeVisible()
    await expect(sheet.getByText("Grade")).toBeVisible()
    await expect(sheet.getByText("Teacher Name")).toBeVisible()
    await expect(sheet.getByRole("button", { name: /edit/i })).toBeVisible()
    await expect(sheet.getByRole("button", { name: /remove/i })).toBeVisible()
  })

  test("16. Edit participant name and save successfully", async ({ page }) => {
    const orgName = `E2E EditParticipant ${Date.now()}`
    await createOrganization(page, orgName)

    await page.getByRole("tab", { name: /fundraisers/i }).click()

    await createFundraiser(page, {
      sponsorEmail: orgAdmin.email,
    })

    await navigateToFundraiserParticipants(page)

    const firstName = `Edit${Date.now()}`
    const lastName = "Before"

    await addParticipant(page, {
      firstName,
      lastName,
      grade: "2nd",
      teacherName: "Mr. Brown",
    })

    await expect(page.getByRole("row").filter({ hasText: firstName })).toBeVisible({ timeout: 10000 })

    const sheet = await viewParticipantDetails(page, firstName)

    const updatedFirstName = `Edited${Date.now()}`
    await editParticipant(page, { firstName: updatedFirstName }, sheet)

    await expect(page.getByRole("row").filter({ hasText: updatedFirstName })).toBeVisible({ timeout: 10000 })
  })

  test("17. Delete a participant from the fundraiser", async ({ page }) => {
    const orgName = `E2E DeleteParticipant ${Date.now()}`
    await createOrganization(page, orgName)

    await page.getByRole("tab", { name: /fundraisers/i }).click()

    await createFundraiser(page, {
      sponsorEmail: orgAdmin.email,
    })

    await navigateToFundraiserParticipants(page)

    const firstName = `Del${Date.now()}`
    const lastName = "ToRemove"

    await addParticipant(page, {
      firstName,
      lastName,
      grade: "1st",
      teacherName: "Ms. Wilson",
    })

    await expect(page.getByRole("row").filter({ hasText: firstName })).toBeVisible({ timeout: 10000 })

    const sheet = await viewParticipantDetails(page, firstName)
    await deleteParticipant(page, sheet)

    await expect(page.getByRole("row").filter({ hasText: firstName })).not.toBeVisible()
  })

  test("18. Navigate to Communications tab and verify empty state", async ({ page }) => {
    const orgName = `E2E Comms ${Date.now()}`
    await createOrganization(page, orgName)

    await page.getByRole("tab", { name: /fundraisers/i }).click()

    await createFundraiser(page, {
      sponsorEmail: orgAdmin.email,
    })

    await navigateToCommunications(page)

    await expect(page.getByText("No results")).toBeVisible()
    await expect(page.getByRole("button", { name: /create message/i })).toBeVisible()
  })

  test("19. Create a message and verify it appears in communications", async ({ page }) => {
    const orgName = `E2E CreateMsg ${Date.now()}`
    await createOrganization(page, orgName)

    await page.getByRole("tab", { name: /fundraisers/i }).click()

    await createFundraiser(page, {
      sponsorEmail: orgAdmin.email,
    })

    await navigateToFundraiserParticipants(page)

    const firstName = `Msg${Date.now()}`
    const lastName = "Recipient"

    await addParticipant(page, {
      firstName,
      lastName,
      grade: "6th",
      teacherName: "Mrs. Taylor",
      parentEmail: "e2e_parent+clerk_test@example.com",
    })

    await expect(page.getByRole("row").filter({ hasText: firstName })).toBeVisible({ timeout: 10000 })

    await navigateToCommunications(page)

    const subject = `E2E Message ${Date.now()}`

    await createMessage(page, {
      subject,
      message: "This is a test announcement message.",
    })

    await expect(page.getByRole("row").filter({ hasText: subject })).toBeVisible({ timeout: 10000 })
  })
})
